import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { skill, weakConcepts } = await req.json()

    if (!skill || !weakConcepts || !Array.isArray(weakConcepts) || weakConcepts.length === 0) {
      return NextResponse.json({ error: 'skill and weakConcepts array are required' }, { status: 400 })
    }

    const rawApiKey = process.env.OPENAI_API_KEY
    if (!rawApiKey || rawApiKey.trim() === 'your-openai-api-key-here') {
      return NextResponse.json({ roadmap: getMockRoadmap(skill, weakConcepts) })
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

    const prompt = `Generate a customized, step-by-step learning roadmap to master the following weak concepts in "${skill}": ${weakConcepts.join(', ')}.

Requirements:
- For each weak concept, return a structured roadmap step.
- Include a brief explanation of what the concept is and why it's important.
- Include 1-2 curated learning resources or documentation titles and actual web URLs (e.g. MDN, Official docs, FreeCodeCamp, Dev.to).
- Include 1 tailored practice task/exercise description.

Return ONLY valid JSON in this exact format:
{
  "roadmap": [
    {
      "concept": "Concept Name",
      "explanation": "Brief explanation here...",
      "resources": [
        { "title": "Resource Title", "url": "https://resource-url-here" }
      ],
      "practiceTask": "Description of the practice task..."
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

    let parsedRoadmap = null
    let lastError: Error | null = null

    for (const modelName of modelNames) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout
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
                content: 'You are an expert technical roadmap generator. Always return valid JSON only, no markdown formatting or extra text.',
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 2000,
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
        if (!parsed.roadmap || !Array.isArray(parsed.roadmap) || parsed.roadmap.length === 0) {
          throw new Error('Invalid or empty roadmap array in JSON response')
        }

        parsedRoadmap = parsed
        break // Successfully generated and parsed roadmap!
      } catch (err: any) {
        clearTimeout(timeoutId)
        if (err.name === 'AbortError') {
          console.warn(`Roadmap model ${modelName} timed out (5s), trying next fallback`)
          lastError = new Error(`Model ${modelName} timed out`)
        } else {
          console.warn(`Roadmap model ${modelName} failed/returned invalid JSON, trying next fallback:`, err.message || err)
          lastError = err
        }
      }
    }

    if (!parsedRoadmap) {
      console.warn('All roadmap models failed or timed out. Using mock roadmap.')
      parsedRoadmap = { roadmap: getMockRoadmap(skill, weakConcepts) }
    }

    return NextResponse.json(parsedRoadmap)
  } catch (err: unknown) {
    console.error('Roadmap generation error:', err)
    return NextResponse.json({ error: 'Failed to generate roadmap' }, { status: 500 })
  }
}

function getMockRoadmap(skill: string, weakConcepts: string[]) {
  return weakConcepts.map((concept) => ({
    concept,
    explanation: `Mastering ${concept} is essential for proficiency in ${skill}. Focus on understanding core principles, syntax patterns, and best practices.`,
    resources: [
      { title: `Official ${skill} Documentation`, url: `https://www.google.com/search?q=official+${encodeURIComponent(skill)}+${encodeURIComponent(concept)}+documentation` },
      { title: `MDN / Web Guides for ${concept}`, url: `https://www.google.com/search?q=${encodeURIComponent(skill)}+${encodeURIComponent(concept)}+tutorial` }
    ],
    practiceTask: `Create a small demo project or code snippet implementing ${concept} from scratch, testing boundary conditions and handling errors.`
  }))
}
