import { NextRequest, NextResponse } from 'next/server'

// Very small skill -> category map used purely to compute a quick, objective
// "team complementarity" signal (category coverage + overlap) that we feed
// into the AI prompt so recommendations aren't just vibes-based.
const SKILL_CATEGORY: Record<string, string> = {
  mysql: 'Database', postgresql: 'Database', mongodb: 'Database', redis: 'Database', sqlite: 'Database', firebase: 'Database',
  'react.js': 'Frontend', 'vue.js': 'Frontend', angular: 'Frontend', 'next.js': 'Frontend', 'html/css': 'Frontend', 'tailwind css': 'Frontend', svelte: 'Frontend',
  'node.js': 'Backend', 'express.js': 'Backend', django: 'Backend', fastapi: 'Backend', 'spring boot': 'Backend', laravel: 'Backend', nestjs: 'Backend',
  python: 'Language', javascript: 'Language', typescript: 'Language', java: 'Language', 'c++': 'Language', go: 'Language', rust: 'Language', kotlin: 'Language',
  docker: 'DevOps', kubernetes: 'DevOps',
  aws: 'Cloud', gcp: 'Cloud', azure: 'Cloud',
  git: 'Tools',
  graphql: 'API', 'rest apis': 'API',
  flutter: 'Mobile', 'react native': 'Mobile',
}

function computeComplementarity(memberProfiles: { name: string; skills: string[] }[]) {
  const categoryToMembers: Record<string, Set<string>> = {}
  for (const m of memberProfiles || []) {
    for (const skill of m.skills || []) {
      const cat = SKILL_CATEGORY[skill.toLowerCase()] || 'Other'
      categoryToMembers[cat] = categoryToMembers[cat] || new Set()
      categoryToMembers[cat].add(m.name)
    }
  }
  const coverage = Object.entries(categoryToMembers).map(([category, members]) => ({
    category,
    memberCount: members.size,
    members: Array.from(members),
  }))
  const allCategories = ['Frontend', 'Backend', 'Database', 'Language', 'DevOps', 'Cloud', 'API', 'Mobile']
  const gaps = allCategories.filter((c) => !categoryToMembers[c])
  // Crude 0-100 score: reward covering more distinct categories, penalize
  // everyone stacking into the same one or two categories.
  const distinctCovered = Object.keys(categoryToMembers).length
  const overloaded = coverage.filter((c) => c.memberCount === (memberProfiles?.length || 0) && distinctCovered <= 2)
  const score = Math.max(0, Math.min(100, Math.round((distinctCovered / allCategories.length) * 100 - overloaded.length * 10)))
  return { coverage, gaps, score }
}

export async function POST(req: NextRequest) {
  try {
    const { hackathon, memberProfiles } = await req.json()
    const complementarity = computeComplementarity(memberProfiles || [])

    const rawApiKey = process.env.OPENAI_API_KEY
    if (!rawApiKey || rawApiKey.trim() === 'your-openai-api-key-here') {
      return NextResponse.json({
        teamAnalysis: 'Team analysis placeholder — add your OpenAI API key to enable AI-powered analysis.',
        personalAnalysis: 'Personal analysis placeholder — add your OpenAI API key to enable AI-powered analysis.',
        teamComplementarity: complementarity,
      })
    }

    const apiKey = rawApiKey.trim()
    const isOpenRouter = apiKey.startsWith('sk-or-v1-')
    const apiUrl = isOpenRouter
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions'

    // Use multiple free models sequentially on OpenRouter to handle rate-limiting/availability issues
    const modelNames = isOpenRouter
      ? ['openai/gpt-oss-120b:free', 'openai/gpt-oss-20b:free', 'meta-llama/llama-3.2-3b-instruct:free']
      : ['gpt-4o']

    const prompt = `Analyze this hackathon team and provide insights:

Team: ${hackathon.teamName}
Problem Statement: ${hackathon.problemStatement}
Previous Idea: ${hackathon.oldIdea || 'N/A'}

Team Members & Skill Scores:
${memberProfiles.map((m: { name: string; skills: string[]; scores: Record<string, number> }) => `- ${m.name}: Skills: ${m.skills?.join(', ')}, Test Scores: ${JSON.stringify(m.scores)}`).join('\n')}

Objectively computed skill-category coverage for this team (use this, don't recompute it yourself):
${JSON.stringify(complementarity, null, 2)}

Provide:
1. Team strengths and skill gaps (explicitly reference the category coverage/gaps data above)
2. Role recommendations for each member
3. Technology stack recommendations based on their skills
4. Areas to improve before the hackathon
5. Personal feedback for the team lead
6. Project Blueprint for "${hackathon.problemStatement}":
   a. How to approach and build this project step by step
   b. Core features to implement within a hackathon timeframe
   c. Specific innovative ideas and unique angles that will make this stand out from typical submissions
   d. Any APIs, datasets, or tools they should leverage

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "teamAnalysis": "...",
  "personalAnalysis": "...",
  "projectBlueprint": "..."
}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }

    if (isOpenRouter) {
      headers['HTTP-Referer'] = 'http://localhost:3000'
      headers['X-Title'] = 'SkillSync'
    }

    let responseData = null
    let lastError: Error | null = null

    for (const modelName of modelNames) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 2500,
          }),
        })

        if (!response.ok) {
          throw new Error(`API error using model ${modelName}: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        if (data.error) {
          throw new Error(`Model ${modelName} returned error: ${data.error.message || JSON.stringify(data.error)}`)
        }

        responseData = data
        break // Succeeded!
      } catch (err: any) {
        console.warn(`Model ${modelName} failed, trying next fallback:`, err.message || err)
        lastError = err
      }
    }

    if (!responseData) {
      throw lastError || new Error('All models failed to perform hackathon analysis')
    }

    let content = responseData.choices[0].message.content.trim()

    // Clean JSON content if wrapped in markdown code blocks
    if (content.startsWith('```')) {
      content = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    }

    const parsed = JSON.parse(content)
    return NextResponse.json({ ...parsed, teamComplementarity: complementarity })
  } catch {
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
