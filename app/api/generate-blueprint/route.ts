import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { teamName, problemStatement, memberProfiles } = await req.json()

    const rawApiKey = process.env.OPENAI_API_KEY
    if (!rawApiKey || rawApiKey.trim() === 'your-openai-api-key-here') {
      // Return a rich fallback blueprint when no API key is configured
      const fallback = generateFallbackBlueprint(teamName, problemStatement, memberProfiles)
      return NextResponse.json({ projectBlueprint: fallback })
    }

    const apiKey = rawApiKey.trim()
    const isOpenRouter = apiKey.startsWith('sk-or-v1-')
    const apiUrl = isOpenRouter
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions'

    const modelNames = isOpenRouter
      ? ['openai/gpt-oss-120b:free', 'openai/gpt-oss-20b:free', 'meta-llama/llama-3.2-3b-instruct:free']
      : ['gpt-4o']

    const skillSummary = (memberProfiles || [])
      .map((m: { name: string; skills: string[] }) => `- ${m.name}: ${(m.skills || []).join(', ') || 'No skills listed'}`)
      .join('\n')

    const prompt = `You are an expert hackathon mentor. Generate a detailed, actionable project blueprint for the following hackathon team.

Team: ${teamName}
Problem Statement / Project Idea: ${problemStatement}

Team Members & Skills:
${skillSummary}

Create a comprehensive project blueprint that covers:

**a. Step-by-step Approach**
A clear, ordered list of implementation steps from day 1 to demo day

**b. Core Features for Hackathon**
The minimum viable features that must be built to have a compelling demo

**c. Innovative Ideas & Unique Angles**
Creative differentiators that will make this project stand out from typical submissions

**d. APIs, Datasets, Tools**
Specific APIs, datasets, libraries, and tools the team should use, tailored to their skills

**e. Architecture Overview**
High-level system architecture and tech stack recommendation matched to their skill set

**f. Execution Timeline**
A realistic hackathon timeline (e.g., Day 1 setup, Day 2 core features, Day 3 polish/demo)

Return ONLY valid JSON with this exact format (no markdown, no code blocks):
{
  "projectBlueprint": "The full blueprint text here as a formatted string using **Section Heading** on its own line followed by bullet points starting with - for each item"
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
            max_tokens: 2000,
          }),
        })

        if (!response.ok) throw new Error(`API error ${response.status}`)
        const data = await response.json()
        if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
        responseData = data
        break
      } catch (err: any) {
        console.warn(`Model ${modelName} failed:`, err.message)
        lastError = err
      }
    }

    if (!responseData) throw lastError || new Error('All models failed')

    let content = responseData.choices[0].message.content.trim()
    if (content.startsWith('```')) {
      content = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    }

    const parsed = JSON.parse(content)
    return NextResponse.json({ projectBlueprint: parsed.projectBlueprint })
  } catch (err: any) {
    console.error('Blueprint generation error:', err)
    return NextResponse.json({ error: 'Blueprint generation failed' }, { status: 500 })
  }
}

function generateFallbackBlueprint(teamName: string, problemStatement: string, memberProfiles: { name: string; skills: string[] }[]): string {
  const allSkills = Array.from(new Set((memberProfiles || []).flatMap((m) => m.skills || [])))
  const hasFrontend = allSkills.some((s) => ['react.js', 'vue.js', 'next.js', 'html/css', 'tailwind css'].includes(s.toLowerCase()))
  const hasBackend = allSkills.some((s) => ['node.js', 'express.js', 'django', 'fastapi', 'python'].includes(s.toLowerCase()))
  const hasDB = allSkills.some((s) => ['mysql', 'postgresql', 'mongodb', 'firebase'].includes(s.toLowerCase()))
  const hasMobile = allSkills.some((s) => ['flutter', 'react native'].includes(s.toLowerCase()))

  const frontendTech = hasFrontend ? 'your existing React/Next.js skills' : 'React.js (beginner-friendly, great ecosystem)'
  const backendTech = hasBackend ? 'your existing Node.js/Python backend' : 'Node.js with Express (fast to set up)'
  const dbTech = hasDB ? 'your existing database skills' : 'Firebase (real-time, no backend needed for MVPs)'

  return `**a. Step-by-step Approach**
- Day 1 Morning: Set up project repository, agree on tech stack, and divide roles among team members
- Day 1 Afternoon: Scaffold the project — initialize frontend, backend, and database schemas
- Day 1 Evening: Implement core data models and basic API endpoints for the primary feature
- Day 2 Morning: Build the main user-facing features — focus on the critical user journey first
- Day 2 Afternoon: Connect frontend to backend, implement authentication if needed
- Day 2 Evening: Add secondary features, error handling, and basic styling
- Day 3 Morning: Polish the UI, fix critical bugs, and prepare a 2-minute demo script
- Day 3 Final: Deploy to a live URL, record a backup demo video, and rehearse the pitch

**b. Core Features for Hackathon**
- User registration and authentication (sign up / log in)
- Core problem-solving feature tailored to "${problemStatement}"
- Simple, intuitive dashboard showing key information at a glance
- Basic CRUD operations (create, read, update, delete) for the main data entity
- Responsive design that works on both desktop and mobile

**c. Innovative Ideas & Unique Angles**
- Add AI-powered suggestions or recommendations using a free API (e.g., OpenAI, Gemini)
- Implement real-time features using WebSockets or Firebase for live collaboration
- Gamification elements (points, badges, streaks) to drive engagement
- Data visualisation with charts (Chart.js or Recharts) to show insights at a glance
- Offline-first capability using service workers for resilience

**d. APIs, Datasets, Tools**
- Use ${frontendTech} for the user interface
- Use ${backendTech} for server-side logic
- Use ${dbTech} for data persistence
- Gemini API or OpenAI API (free tier) for AI-powered features
- Vercel or Netlify for instant, free frontend deployment
- GitHub Actions for basic CI/CD to auto-deploy on push
- Postman for API testing during development

**e. Architecture Overview**
- Frontend: Single-page application (SPA) with component-based architecture
- Backend: RESTful API server handling business logic and data validation
- Database: Structured storage for user data, with indexes on frequently queried fields
- Authentication: JWT tokens or session-based auth for secure access
- Deployment: Frontend on Vercel / Netlify, Backend on Render / Railway (all free tier)

**f. Execution Timeline**
- Hour 0–4: Project setup, environment config, team role assignments, and API key provisioning
- Hour 4–12: Core backend APIs and database schema; basic frontend scaffold with routing
- Hour 12–20: Main feature implementation; frontend and backend integration; first working demo
- Hour 20–28: Secondary features, UI polish, responsive design, and error handling
- Hour 28–34: Testing, bug fixes, deployment to live URL, and demo preparation
- Hour 34–36: Final rehearsal, pitch deck (3 slides max), and submission`
}
