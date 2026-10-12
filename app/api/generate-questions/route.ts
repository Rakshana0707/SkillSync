import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { skill, level, existingIds = [] } = await req.json()

    if (!skill || !level) {
      return NextResponse.json({ error: 'skill and level are required' }, { status: 400 })
    }

    // 1. Determine number of repeated and new questions
    const totalQuestions = 10
    const repeatTarget = Math.floor(totalQuestions * 0.25) // 2 questions for total=10

    // 2. Fetch up to repeatTarget questions from the database pool
    // We select questions that match skill and level, and have been used less than 3 times
    let repeatedQuestions: any[] = []
    try {
      const { data: dbPool, error: dbError } = await supabase
        .from('questions')
        .select('*')
        .eq('skill', skill)
        .eq('level', level)
        .lt('use_count', 3)

      if (dbError) {
        console.error('Failed to query questions from DB:', dbError.message)
      } else if (dbPool && dbPool.length > 0) {
        // Randomly select up to repeatTarget questions from the pool
        const shuffledPool = [...dbPool].sort(() => Math.random() - 0.5)
        repeatedQuestions = shuffledPool.slice(0, repeatTarget)

        // Increment the use_count for selected questions in the database
        const selectedIds = repeatedQuestions.map(q => q.id)
        if (selectedIds.length > 0) {
          await Promise.all(
            repeatedQuestions.map(q =>
              supabase
                .from('questions')
                .update({ use_count: q.use_count + 1 })
                .eq('id', q.id)
            )
          )
        }
      }
    } catch (dbErr) {
      console.error('Database query error during question fetch:', dbErr)
    }

    const newQuestionsCount = totalQuestions - repeatedQuestions.length

    // 3. Generate new questions if needed
    let newQuestions: any[] = []
    if (newQuestionsCount > 0) {
      const rawApiKey = process.env.OPENAI_API_KEY
      if (!rawApiKey || rawApiKey.trim() === 'your-openai-api-key-here') {
        // Return mock questions if no API key configured
        newQuestions = getMockQuestions(skill, level, newQuestionsCount)
      } else {
        const apiKey = rawApiKey.trim()
        const isOpenRouter = apiKey.startsWith('sk-or-v1-')
        const apiUrl = isOpenRouter
          ? 'https://openrouter.ai/api/v1/chat/completions'
          : 'https://api.openai.com/v1/chat/completions'

        const modelNames = isOpenRouter
          ? [
              'openai/gpt-oss-120b:free',
              'openai/gpt-oss-20b:free',
              'meta-llama/llama-3.2-3b-instruct:free',
              'mistralai/mistral-7b-instruct:free',
            ]
          : ['gpt-4o']

        const levelDescriptions: Record<string, string> = {
          easy: 'basic conceptual questions, definitions, simple syntax, beginner-friendly',
          medium: 'intermediate practical questions, common patterns, moderate complexity',
          hard: 'advanced architecture, edge cases, performance optimization, expert-level',
        }

        // To help the LLM generate truly new questions, we can list the questions we already have in the DB or the ones we're repeating
        let recentQuestionsListStr = 'none'
        try {
          const { data: recentQuestions } = await supabase
            .from('questions')
            .select('question')
            .eq('skill', skill)
            .eq('level', level)
            .limit(15)
          if (recentQuestions && recentQuestions.length > 0) {
            recentQuestionsListStr = recentQuestions.map(q => q.question).join(' | ')
          }
        } catch (_) {}

        const prompt = `Generate exactly ${newQuestionsCount} multiple-choice questions about "${skill}" at ${level} difficulty level (${levelDescriptions[level]}).

Requirements:
- Each question must be unique and different from these existing questions: ${recentQuestionsListStr}
- 4 answer options (A, B, C, D)
- Only one correct answer
- Questions must be randomized in order each time
- Include brief explanation for the correct answer
- Include key concept(s) tested

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "id": "unique-uuid-here",
      "skill": "${skill}",
      "level": "${level}",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Why this answer is correct...",
      "concepts": ["concept1", "concept2"]
    }
  ]
}`

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        }

        if (isOpenRouter) {
          headers['HTTP-Referer'] = 'http://localhost:3000'
          headers['X-Title'] = 'SkillSync'
        }

        let parsedQuestions = null
        let lastError: Error | null = null

        for (const modelName of modelNames) {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 4000)
          try {
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers,
              signal: controller.signal,
              body: JSON.stringify({
                model: modelName,
                messages: [
                  {
                    role: 'system',
                    content: 'You are an expert technical quiz generator. Always return valid JSON only, no markdown or extra text.',
                  },
                  { role: 'user', content: prompt },
                ],
                temperature: 0.8,
                max_tokens: 3000,
              }),
            })

            clearTimeout(timeoutId)

            if (!response.ok) {
              throw new Error(`API error: ${response.status} ${response.statusText}`)
            }

            const data = await response.json()
            if (data.error) {
              throw new Error(`Model returned error: ${data.error.message || JSON.stringify(data.error)}`)
            }

            let content = data.choices[0].message.content.trim()

            if (content.startsWith('```')) {
              content = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
            }

            const parsed = JSON.parse(content)
            if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
              throw new Error('Invalid or empty questions array in JSON response')
            }

            parsedQuestions = parsed
            break
          } catch (err: any) {
            clearTimeout(timeoutId)
            if (err.name === 'AbortError') {
              console.warn(`Model ${modelName} timed out (4s), trying next fallback`)
              lastError = new Error(`Model ${modelName} timed out`)
            } else {
              console.warn(`Model ${modelName} failed/returned invalid JSON, trying next fallback:`, err.message || err)
              lastError = err
            }
          }
        }

        if (parsedQuestions && parsedQuestions.questions) {
          newQuestions = parsedQuestions.questions
        } else {
          console.warn('All models failed to generate questions or timed out. Falling back to mock questions.')
          newQuestions = getMockQuestions(skill, level, newQuestionsCount)
        }
      }

      // Save new questions to the database (with initial use_count = 1)
      if (newQuestions.length > 0) {
        try {
          const insertData = newQuestions.map(q => ({
            skill: q.skill,
            level: q.level,
            question: q.question,
            options: q.options,
            correct: q.correct,
            explanation: q.explanation,
            concepts: q.concepts,
            use_count: 1
          }))

          const { data: inserted, error: insertError } = await supabase
            .from('questions')
            .insert(insertData)
            .select()

          if (insertError) {
            console.error('Failed to insert new questions into DB:', insertError.message)
          } else if (inserted && inserted.length === newQuestions.length) {
            newQuestions = inserted.map((insQ, idx) => ({
              ...newQuestions[idx],
              id: insQ.id
            }))
          }
        } catch (dbErr) {
          console.error('Failed to save newly generated questions to DB:', dbErr)
        }
      }
    }

    // 4. Combine repeated and new questions
    let allQuestions = [...repeatedQuestions, ...newQuestions]

    // Programmatically shuffle the choices for each question to ensure they are randomized
    allQuestions = allQuestions.map((q: any) => {
      if (q.options && Array.isArray(q.options) && typeof q.correct === 'number' && q.correct >= 0 && q.correct < q.options.length) {
        const originalOptions = [...q.options]
        const correctText = originalOptions[q.correct]

        const shuffled = [...originalOptions]
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const newCorrect = shuffled.indexOf(correctText)
        return {
          id: q.id,
          skill: q.skill,
          level: q.level,
          question: q.question,
          options: shuffled,
          correct: newCorrect !== -1 ? newCorrect : q.correct,
          explanation: q.explanation,
          concepts: q.concepts
        }
      }
      return q
    })

    // Randomize the order of the combined questions list
    allQuestions = allQuestions.sort(() => Math.random() - 0.5)

    return NextResponse.json({ questions: allQuestions })
  } catch (err: unknown) {
    console.error('Question generation error:', err)
    return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 })
  }
}

function getMockQuestions(skill: string, level: string, count: number = 10) {
  const questions = []
  for (let i = 0; i < count; i++) {
    questions.push({
      id: `mock-${skill}-${level}-${i}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      skill,
      level,
      question: `[${level.toUpperCase()}] Sample question ${i + 1} about ${skill}. What is the correct answer?`,
      options: [
        `Correct answer for ${skill} concept`,
        `Wrong answer option B`,
        `Wrong answer option C`,
        `Wrong answer option D`,
      ],
      correct: 0,
      explanation: `This is the correct answer because it properly demonstrates ${skill} principles at the ${level} level.`,
      concepts: [`${skill} basics`, `${level} concepts`],
    })
  }
  return questions
}
