import { NextRequest, NextResponse } from 'next/server'

// Scores the learner's free-text answer to the follow-up question from
// /api/generate-followup. Returns a 0-1 score plus one line of feedback.
// This is informational only — it is stored alongside the test session but
// does not change the MCQ pass/fail result.
export async function POST(req: NextRequest) {
  try {
    const { skill, concept, question, answer } = await req.json()

    if (!question || !answer || typeof answer !== 'string' || answer.trim().length === 0) {
      return NextResponse.json({ error: 'question and answer are required' }, { status: 400 })
    }

    const rawApiKey = process.env.OPENAI_API_KEY
    if (!rawApiKey || rawApiKey.trim() === 'your-openai-api-key-here') {
      // Heuristic mock scoring: reward longer, more specific-looking answers.
      const words = answer.trim().split(/\s+/).length
      const score = Math.min(1, Math.max(0.2, words / 40))
      return NextResponse.json({
        score,
        feedback: words < 8
          ? 'Try to expand a bit more — mention what the concept does and a small example.'
          : 'Solid explanation — nice use of your own words.',
      })
    }

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

    const prompt = `Skill: ${skill || 'N/A'}
Concept being tested: ${concept || 'N/A'}
Question asked: "${question}"
Learner's answer: "${answer}"

Grade the answer for conceptual correctness and clarity, generously but honestly.
Return ONLY valid JSON, no markdown:
{ "score": 0.0-1.0, "feedback": "one short encouraging sentence with a concrete tip" }`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }
    if (isOpenRouter) {
      headers['HTTP-Referer'] = 'http://localhost:3000'
      headers['X-Title'] = 'SkillSync'
    }

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
              { role: 'system', content: 'You are a fair, encouraging technical grader. Return only JSON.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 200,
          }),
        })
        clearTimeout(timeoutId)
        if (!response.ok) throw new Error(`API error: ${response.status}`)
        const data = await response.json()
        if (data.error) throw new Error(data.error.message || 'model error')
        let content = data.choices[0].message.content.trim()
        if (content.startsWith('```')) {
          content = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
        }
        const parsed = JSON.parse(content)
        if (typeof parsed.score === 'number') {
          parsed.score = Math.min(1, Math.max(0, parsed.score))
          return NextResponse.json(parsed)
        }
        throw new Error('missing score in response')
      } catch (err) {
        clearTimeout(timeoutId)
        continue
      }
    }

    const words = answer.trim().split(/\s+/).length
    const score = Math.min(1, Math.max(0.2, words / 40))
    return NextResponse.json({
      score,
      feedback: 'Scored using a fallback heuristic since the AI grader was unavailable.',
    })
  } catch (err) {
    console.error('Follow-up scoring error:', err)
    return NextResponse.json({ error: 'Failed to score follow-up answer' }, { status: 500 })
  }
}
