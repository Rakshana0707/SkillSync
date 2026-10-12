import { NextRequest, NextResponse } from 'next/server'

// Generates ONE short free-response "explain it in your own words" question
// targeting a concept the user got wrong on their MCQ test. This is an
// optional bonus round shown after the multiple-choice test — it never
// blocks or changes the pass/fail result, it just gives a deeper signal and
// some extra feedback for the person's dashboard/roadmap.
export async function POST(req: NextRequest) {
  try {
    const { skill, level, concept } = await req.json()

    if (!skill || !concept) {
      return NextResponse.json({ error: 'skill and concept are required' }, { status: 400 })
    }

    const rawApiKey = process.env.OPENAI_API_KEY
    if (!rawApiKey || rawApiKey.trim() === 'your-openai-api-key-here') {
      return NextResponse.json({
        question: `In your own words, explain what "${concept}" means in ${skill} and give a short example of when you'd use it.`,
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

    const prompt = `The learner got a question about "${concept}" (part of "${skill}", ${level} level) wrong.
Write ONE short free-response interview-style question that asks them to explain that concept in their own words or apply it to a tiny scenario. Keep it under 30 words.

Return ONLY valid JSON, no markdown:
{ "question": "..." }`

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
              { role: 'system', content: 'You write concise interview-style follow-up questions. Return only JSON.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.6,
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
        if (parsed.question) return NextResponse.json(parsed)
        throw new Error('missing question in response')
      } catch (err) {
        clearTimeout(timeoutId)
        continue
      }
    }

    // All models failed — fall back to a template question rather than a 500.
    return NextResponse.json({
      question: `In your own words, explain what "${concept}" means in ${skill} and give a short example of when you'd use it.`,
    })
  } catch (err) {
    console.error('Follow-up generation error:', err)
    return NextResponse.json({ error: 'Failed to generate follow-up question' }, { status: 500 })
  }
}
