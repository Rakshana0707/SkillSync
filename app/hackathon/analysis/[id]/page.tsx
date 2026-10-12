'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'
import { TopBar } from '@/components/layout/TopBar'
import { useAppStore } from '@/store/appStore'
import { CollaborationScore } from '@/types'

interface TeamMemberLite {
  userId: string
  name: string
}

interface Complementarity {
  coverage: { category: string; memberCount: number; members: string[] }[]
  gaps: string[]
  score: number
}

interface Section {
  heading: string
  body: string[]
}

/** Parse raw markdown-style text into structured sections */
function parseAnalysis(raw: string): Section[] {
  if (!raw) return []
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
  const sections: Section[] = []
  let current: Section | null = null

  for (const line of lines) {
    // Bold headings like **Team Strengths** or ## Team Strengths
    const headingMatch = line.match(/^\*\*(.+?)\*\*[:\s]*$/) || line.match(/^#{1,3}\s+(.+)$/)
    if (headingMatch) {
      if (current) sections.push(current)
      current = { heading: headingMatch[1].replace(/\*/g, '').trim(), body: [] }
    } else {
      // Strip leading dashes, bullets, asterisks, numbers
      const cleaned = line
        .replace(/^\*\*(.+?)\*\*/, '$1')   // inline bold at start
        .replace(/^[-*•]\s*/, '')
        .replace(/^\d+\.\s*/, '')
        .replace(/\*\*/g, '')               // remove remaining bold markers
        .trim()
      if (!cleaned) continue
      if (!current) {
        current = { heading: 'Overview', body: [] }
      }
      current.body.push(cleaned)
    }
  }
  if (current) sections.push(current)
  return sections
}

const SECTION_ICONS: Record<string, string> = {
  'team strength': '💪',
  'strength': '💪',
  'skill gap': '⚠️',
  'gap': '⚠️',
  'role recommendation': '🎯',
  'recommendation': '🎯',
  'technology stack': '🛠️',
  'tech stack': '🛠️',
  'version control': '🔀',
  'area': '📈',
  'improvement': '📈',
  'overall': '📊',
  'assessment': '📊',
  'time management': '⏱️',
  'collaboration': '🤝',
  'deployment': '🚀',
  'front-end': '🖥️',
  'frontend': '🖥️',
  'back-end': '⚙️',
  'backend': '⚙️',
}

function getIcon(heading: string): string {
  const lower = heading.toLowerCase()
  for (const [key, icon] of Object.entries(SECTION_ICONS)) {
    if (lower.includes(key)) return icon
  }
  return '📌'
}

export default function HackathonAnalysisPage() {
  const params = useParams()
  const router = useRouter()
  const hackId = params.id as string
  const { profile } = useAppStore()
  const printRef = useRef<HTMLDivElement>(null)

  const [teamName, setTeamName] = useState('')
  const [problemStatement, setProblemStatement] = useState('')
  const [teamSections, setTeamSections] = useState<Section[]>([])
  const [personalSections, setPersonalSections] = useState<Section[]>([])
  const [blueprintSections, setBlueprintSections] = useState<Section[]>([])
  const [complementarity, setComplementarity] = useState<Complementarity | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Blueprint generation state
  const [generatingBlueprint, setGeneratingBlueprint] = useState(false)
  const [memberProfiles, setMemberProfiles] = useState<{ name: string; skills: string[] }[]>([])

  // PDF save state
  const [savingPdf, setSavingPdf] = useState(false)

  // Peer review state
  const [teamMembers, setTeamMembers] = useState<TeamMemberLite[]>([])
  const [ratings, setRatings] = useState<Record<string, { contribution: number; communication: number; technical: number; comment: string }>>({})
  const [savingReview, setSavingReview] = useState<string | null>(null)
  const [savedReview, setSavedReview] = useState<Set<string>>(new Set())
  const [collabScores, setCollabScores] = useState<CollaborationScore[]>([])

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('hackathons')
        .select('team_name, problem_statement, team_analysis, personal_analysis, project_blueprint, team_complementarity')
        .eq('id', hackId)
        .single()

      if (error || !data) { setNotFound(true); setLoading(false); return }

      setTeamName(data.team_name || 'Your Team')
      setProblemStatement(data.problem_statement || '')
      setTeamSections(parseAnalysis(data.team_analysis || ''))
      setPersonalSections(parseAnalysis(data.personal_analysis || ''))
      setBlueprintSections(parseAnalysis(data.project_blueprint || ''))
      setComplementarity(data.team_complementarity || null)

      // Load accepted team members for the peer review form & blueprint generation
      const { data: members } = await supabase
        .from('hackathon_members')
        .select('user_id, name, email')
        .eq('hackathon_id', hackId)
        .eq('invite_accepted', true)
      const memberList: TeamMemberLite[] = (members || [])
        .filter((m: any) => m.user_id && m.user_id !== profile?.id)
        .map((m: any) => ({ userId: m.user_id, name: m.name || m.email }))
      setTeamMembers(memberList)

      // Build member profiles for blueprint generation
      const profiles = (members || []).map((m: any) => ({
        name: m.name || m.email,
        skills: profile?.skills?.map((s: any) => s.n) || [],
      }))
      setMemberProfiles(profiles)

      // Load this user's existing reviews so the form pre-fills / shows "saved"
      if (profile?.id) {
        const { data: existing } = await supabase
          .from('hackathon_peer_reviews')
          .select('reviewee_id, contribution_rating, communication_rating, technical_rating, comment')
          .eq('hackathon_id', hackId)
          .eq('reviewer_id', profile.id)
        const initialRatings: typeof ratings = {}
        const initialSaved = new Set<string>()
        for (const r of existing || []) {
          initialRatings[r.reviewee_id] = {
            contribution: r.contribution_rating,
            communication: r.communication_rating,
            technical: r.technical_rating,
            comment: r.comment || '',
          }
          initialSaved.add(r.reviewee_id)
        }
        setRatings(initialRatings)
        setSavedReview(initialSaved)
      }

      // Load aggregate collaboration scores (visible to any team member)
      const { data: scores } = await supabase.rpc('get_hackathon_collaboration_scores', { p_hackathon_id: hackId })
      if (scores) {
        setCollabScores(scores.map((s: any) => ({
          revieweeId: s.reviewee_id,
          fullName: s.full_name,
          avgContribution: Number(s.avg_contribution),
          avgCommunication: Number(s.avg_communication),
          avgTechnical: Number(s.avg_technical),
          overallScore: Number(s.overall_score),
          reviewCount: s.review_count,
        })))
      }

      setLoading(false)
    }
    load()
  }, [hackId, profile?.id])

  const setRating = (userId: string, field: 'contribution' | 'communication' | 'technical', value: number) => {
    setRatings((prev) => {
      const base = prev[userId] || { contribution: 3, communication: 3, technical: 3, comment: '' }
      return { ...prev, [userId]: { ...base, [field]: value } }
    })
  }

  const setComment = (userId: string, value: string) => {
    setRatings((prev) => {
      const base = prev[userId] || { contribution: 3, communication: 3, technical: 3, comment: '' }
      return { ...prev, [userId]: { ...base, comment: value } }
    })
  }

  const submitReview = async (userId: string) => {
    if (!profile?.id) return
    const r = ratings[userId] || { contribution: 3, communication: 3, technical: 3, comment: '' }
    setSavingReview(userId)
    const { error } = await supabase.from('hackathon_peer_reviews').upsert({
      hackathon_id: hackId,
      reviewer_id: profile.id,
      reviewee_id: userId,
      contribution_rating: r.contribution,
      communication_rating: r.communication,
      technical_rating: r.technical,
      comment: r.comment || null,
    }, { onConflict: 'hackathon_id,reviewer_id,reviewee_id' })
    setSavingReview(null)
    if (!error) {
      setSavedReview((prev) => new Set(prev).add(userId))
      const { data: scores } = await supabase.rpc('get_hackathon_collaboration_scores', { p_hackathon_id: hackId })
      if (scores) {
        setCollabScores(scores.map((s: any) => ({
          revieweeId: s.reviewee_id,
          fullName: s.full_name,
          avgContribution: Number(s.avg_contribution),
          avgCommunication: Number(s.avg_communication),
          avgTechnical: Number(s.avg_technical),
          overallScore: Number(s.overall_score),
          reviewCount: s.review_count,
        })))
      }
    } else {
      console.error('Failed to save peer review:', error)
    }
  }

  /** Generate project blueprint via AI and save to DB */
  const generateBlueprint = async () => {
    setGeneratingBlueprint(true)
    try {
      const res = await fetch('/api/generate-blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamName, problemStatement, memberProfiles }),
      })
      const data = await res.json()
      if (data.projectBlueprint) {
        const parsed = parseAnalysis(data.projectBlueprint)
        setBlueprintSections(parsed)
        // Persist to DB
        await supabase.from('hackathons').update({ project_blueprint: data.projectBlueprint }).eq('id', hackId)
      }
    } catch (err) {
      console.error('Blueprint generation failed:', err)
    }
    setGeneratingBlueprint(false)
  }

  /** Build and download a clean, structured PDF using jsPDF — no screenshots */
  const savePDF = async () => {
    setSavingPdf(true)
    try {
      const { default: jsPDF } = await import('jspdf')

      // ── Text sanitiser ────────────────────────────────────────────────────
      // Decode HTML entities and replace special Unicode with safe ASCII
      const clean = (raw: string): string => {
        return raw
          // common HTML entities
          .replace(/&amp;/g, '&')
          .replace(/&apos;/g, "'")
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&nbsp;/g, ' ')
          // smart quotes / dashes  →  plain ASCII
          .replace(/[\u2018\u2019]/g, "'")
          .replace(/[\u201C\u201D]/g, '"')
          .replace(/[\u2013\u2014]/g, '-')
          .replace(/\u2026/g, '...')
          .replace(/\u2022/g, '-')
          // strip any remaining non-latin characters jsPDF cannot render
          .replace(/[^\x00-\xFF]/g, '')
          .trim()
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW  = 210
      const pageH  = 297
      const mL     = 18          // left margin
      const mR     = 18          // right margin
      const cW     = pageW - mL - mR   // usable content width
      let y = 0

      // ── Colour palette ────────────────────────────────────────────────────
      const GOLD  = [180, 140, 60]  as [number,number,number]
      const TEAL  = [42,  148, 140] as [number,number,number]
      const DARK  = [30,  30,  50]  as [number,number,number]
      const GREY  = [100, 110, 130] as [number,number,number]
      const LGREY = [220, 224, 232] as [number,number,number]
      const WHITE = [255, 255, 255] as [number,number,number]
      const BGSEC = [248, 249, 252] as [number,number,number]

      // ── Helpers ───────────────────────────────────────────────────────────
      const setFont = (style: 'normal'|'bold', size: number, color: [number,number,number]) => {
        doc.setFont('helvetica', style)
        doc.setFontSize(size)
        doc.setTextColor(...color)
      }

      const wrapLine = (text: string, maxW: number, fontSize: number): string[] => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(fontSize)
        return doc.splitTextToSize(clean(text), maxW)
      }

      const ensurePage = (needed: number) => {
        if (y + needed > pageH - 22) {
          doc.addPage()
          y = 18
        }
      }

      const drawFooter = () => {
        const total = doc.getNumberOfPages()
        for (let p = 1; p <= total; p++) {
          doc.setPage(p)
          setFont('normal', 7.5, GREY)
          doc.text(`SkillSync  -  AI Hackathon Analysis  -  ${clean(teamName)}`, mL, pageH - 9)
          doc.text(`Page ${p} / ${total}`, pageW - mR, pageH - 9, { align: 'right' })
          doc.setDrawColor(...LGREY)
          doc.setLineWidth(0.3)
          doc.line(mL, pageH - 13, pageW - mR, pageH - 13)
        }
      }

      // ── Header / Cover ────────────────────────────────────────────────────
      // Top gold bar
      doc.setFillColor(...GOLD)
      doc.rect(0, 0, pageW, 4, 'F')

      // Light header bg
      doc.setFillColor(245, 246, 250)
      doc.rect(0, 4, pageW, 50, 'F')

      // Logo
      setFont('bold', 9, GOLD)
      doc.text('SKILLSYNC', mL, 14)

      // AI badge (top-right)
      doc.setFillColor(...GOLD)
      doc.roundedRect(pageW - mR - 30, 7, 30, 9, 2, 2, 'F')
      setFont('bold', 7, WHITE)
      doc.text('AI-POWERED ANALYSIS', pageW - mR - 15, 13, { align: 'center' })

      // Team name
      setFont('bold', 24, DARK)
      doc.text(clean(teamName), mL, 31)

      // Subtitle
      setFont('normal', 9.5, GREY)
      doc.text('Personalised insights to help your team perform at its best.', mL, 40)

      // Problem statement bar
      if (problemStatement) {
        const ps = clean(`Problem: ${problemStatement}`)
        const psWrapped = wrapLine(ps, cW - 8, 8.5)
        doc.setFillColor(...TEAL)
        doc.roundedRect(mL, 44, cW, 9.5, 2, 2, 'F')
        setFont('bold', 8.5, WHITE)
        doc.text(psWrapped[0], mL + 4, 50)
      }

      // Divider
      doc.setDrawColor(...LGREY)
      doc.setLineWidth(0.5)
      doc.line(mL, 57, pageW - mR, 57)
      y = 64

      // ── Section group title ───────────────────────────────────────────────
      const drawGroupTitle = (title: string, color: [number,number,number]) => {
        ensurePage(22)
        doc.setFillColor(color[0], color[1], color[2])
        doc.rect(mL, y, 4, 13, 'F')
        setFont('bold', 12, color)
        doc.text(title.toUpperCase(), mL + 9, y + 9)
        y += 17
      }

      // ── Section cards ─────────────────────────────────────────────────────
      const renderSections = (
        sections: typeof teamSections,
        title: string,
        accent: [number,number,number]
      ) => {
        if (!sections.length) return
        drawGroupTitle(title, accent)

        sections.forEach((sec) => {
          // Pre-calculate wrapped lines for accurate height
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9.5)
          const allWrapped = sec.body.map((b) => wrapLine(b, cW - 16, 9.5))
          const lineCount  = allWrapped.reduce((s, w) => s + w.length, 0)
          const blockH     = 16 + lineCount * 5.2 + sec.body.length * 1.5 + 6

          ensurePage(blockH)

          // Card bg
          doc.setFillColor(...BGSEC)
          doc.roundedRect(mL, y, cW, blockH, 3, 3, 'F')
          // Left accent stripe
          doc.setFillColor(accent[0], accent[1], accent[2])
          doc.roundedRect(mL, y, 3.5, blockH, 1.5, 1.5, 'F')

          // Heading
          setFont('bold', 10, accent)
          doc.text(clean(sec.heading), mL + 9, y + 8)

          // Thin divider
          doc.setDrawColor(...LGREY)
          doc.setLineWidth(0.25)
          doc.line(mL + 9, y + 11, mL + cW - 4, y + 11)

          // Bullets
          let by = y + 17
          allWrapped.forEach((wrapped) => {
            // bullet dot
            doc.setFillColor(accent[0], accent[1], accent[2])
            doc.circle(mL + 10.5, by - 1.5, 1, 'F')
            // text lines
            setFont('normal', 9.5, DARK)
            wrapped.forEach((wl, wi) => {
              doc.text(wl, mL + 14, by)
              if (wi < wrapped.length - 1) by += 5.2
            })
            by += 6.5
          })

          y += blockH + 5
        })
        y += 4
      }

      // ── Team Skill Coverage (structured table layout) ─────────────────────
      const renderSkillCoverage = () => {
        if (!complementarity) return
        ensurePage(24)

        drawGroupTitle('Team Skill Coverage', GOLD)

        // Score badge inline
        const scoreLabel = `Complementarity Score: ${complementarity.score} / 100`
        ensurePage(10)
        doc.setFillColor(245, 235, 200)
        doc.roundedRect(mL, y, cW, 10, 2, 2, 'F')
        setFont('bold', 9.5, GOLD)
        doc.text(scoreLabel, mL + cW / 2, y + 6.8, { align: 'center' })
        y += 14

        // Two-column table: Covered | Gaps
        const colW = (cW - 6) / 2

        // Header row
        ensurePage(10)
        doc.setFillColor(...TEAL)
        doc.roundedRect(mL, y, colW, 9, 2, 2, 'F')
        setFont('bold', 9, WHITE)
        doc.text('Covered Skills', mL + colW / 2, y + 6, { align: 'center' })

        doc.setFillColor(210, 60, 80)
        doc.roundedRect(mL + colW + 6, y, colW, 9, 2, 2, 'F')
        setFont('bold', 9, WHITE)
        doc.text('Skill Gaps', mL + colW + 6 + colW / 2, y + 6, { align: 'center' })
        y += 12

        // Data rows
        const covItems = complementarity.coverage.map(
          (c) => `${c.category}  (${c.members.join(', ')})`
        )
        const gapItems = complementarity.gaps

        const maxRows = Math.max(covItems.length, gapItems.length)

        for (let i = 0; i < maxRows; i++) {
          ensurePage(9)
          const rowBg = i % 2 === 0 ? [242, 248, 246] : [255, 255, 255]
          doc.setFillColor(rowBg[0], rowBg[1], rowBg[2])
          doc.rect(mL, y, colW, 8, 'F')
          doc.rect(mL + colW + 6, y, colW, 8, 'F')

          if (covItems[i]) {
            setFont('normal', 8.5, [30, 100, 90])
            const wrapped = wrapLine(covItems[i], colW - 6, 8.5)
            doc.text(wrapped[0], mL + 3, y + 5.5)
          }

          if (gapItems[i]) {
            setFont('normal', 8.5, [160, 50, 70])
            const wrapped = wrapLine(gapItems[i], colW - 6, 8.5)
            doc.text(wrapped[0], mL + colW + 9, y + 5.5)
          }

          y += 8
        }

        // Bottom border
        doc.setDrawColor(...LGREY)
        doc.setLineWidth(0.3)
        doc.line(mL, y, mL + cW, y)
        y += 8
      }

      // ── Render all sections ───────────────────────────────────────────────
      renderSections(teamSections, 'Team Analysis', GOLD)
      renderSkillCoverage()
      renderSections(blueprintSections, 'Project Blueprint', TEAL)
      renderSections(personalSections, 'Personal Analysis', TEAL)

      // ── Stamp footers on all pages ────────────────────────────────────────
      drawFooter()

      doc.save(`${clean(teamName).replace(/\s+/g, '_')}_Analysis.pdf`)
    } catch (err) {
      console.error('PDF generation failed:', err)
    }
    setSavingPdf(false)
  }



  if (loading) {
    return (
      <AppShell>
        <TopBar title="AI Analysis" subtitle="Loading your team analysis..." />
        <div className="flex items-center justify-center h-64">
          <div style={{ color: 'var(--gold)' }} className="text-sm animate-pulse">Fetching analysis…</div>
        </div>
      </AppShell>
    )
  }

  if (notFound) {
    return (
      <AppShell>
        <TopBar title="AI Analysis" subtitle="" />
        <div className="p-8 text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold" style={{ color: 'var(--text)' }}>Analysis not found</p>
          <p className="text-sm mt-1" style={{ color: 'var(--muted2)' }}>This hackathon may not have been analysed yet.</p>
          <button
            onClick={() => router.push('/hackathon')}
            className="mt-6 px-5 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--gold)', color: 'var(--ink)' }}
          >
            ← Back to Hackathon
          </button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <TopBar title="AI Analysis" subtitle={`Team · ${teamName}`} />
      <div className="p-6 max-w-3xl space-y-8">

        {/* Top actions — hidden in PDF */}
        <div className="flex items-center justify-between print-hide">
          <button
            onClick={() => router.push('/hackathon')}
            className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: 'var(--gold)' }}
          >
            ← Back to My Hackathon
          </button>
          
          <button
            onClick={savePDF}
            disabled={savingPdf}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--gold)', color: 'var(--ink)' }}
          >
            {savingPdf ? (
              <>
                <span className="spin-ring w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ border: '2px solid rgba(8,9,15,0.3)', borderTopColor: 'var(--ink)' }} />
                Generating PDF…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Save as PDF
              </>
            )}
          </button>
        </div>

        {/* === PDF-captured content starts here === */}
        <div ref={printRef}>

        {/* Header card */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(232,201,122,0.08) 0%, rgba(79,209,197,0.05) 100%)',
            border: '1px solid rgba(232,201,122,0.2)',
          }}
        >
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            ⚡ AI-Powered Hackathon Analysis
          </p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--font-playfair)' }}>
            {teamName}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted2)' }}>
            Personalised insights to help your team perform at its best.
          </p>
        </div>

        {/* Team Analysis */}
        {teamSections.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🧠</span>
              <h2 className="text-base font-bold uppercase tracking-widest" style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>
                Team Analysis
              </h2>
            </div>
            <div className="space-y-4">
              {teamSections.map((sec, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-5"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{getIcon(sec.heading)}</span>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>{sec.heading}</h3>
                  </div>
                  <ul className="space-y-2">
                    {sec.body.map((line, j) => (
                      <li key={j} className="flex gap-2 text-sm leading-relaxed" style={{ color: 'var(--muted2)' }}>
                        <span className="mt-1 shrink-0" style={{ color: 'var(--gold)' }}>•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Project Blueprint */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-lg">🚀</span>
            <h2 className="text-base font-bold uppercase tracking-widest" style={{ color: 'var(--teal)', fontFamily: 'var(--font-mono)' }}>
              Project Blueprint
            </h2>
            {blueprintSections.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(79,209,197,0.1)', color: 'var(--teal)', border: '1px solid rgba(79,209,197,0.3)' }}>AI</span>
            )}
          </div>

          {blueprintSections.length > 0 ? (
            <div
              className="rounded-2xl p-1"
              style={{ background: 'linear-gradient(135deg, rgba(79,209,197,0.15), rgba(232,201,122,0.08))', padding: '2px' }}
            >
              <div className="rounded-2xl space-y-4 p-1" style={{ background: 'var(--surface)' }}>
                {blueprintSections.map((sec, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-5"
                    style={{ background: 'var(--card)', border: '1px solid rgba(79,209,197,0.15)' }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{getIcon(sec.heading)}</span>
                      <h3 className="text-sm font-bold" style={{ color: 'var(--teal)' }}>{sec.heading}</h3>
                    </div>
                    <ul className="space-y-2">
                      {sec.body.map((line, j) => (
                        <li key={j} className="flex gap-2 text-sm leading-relaxed" style={{ color: 'var(--muted2)' }}>
                          <span className="mt-1 shrink-0" style={{ color: 'var(--teal)' }}>→</span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Empty blueprint — show a generate CTA */
            <div
              className="rounded-2xl p-8 text-center"
              style={{
                background: 'linear-gradient(135deg, rgba(79,209,197,0.05) 0%, rgba(232,201,122,0.03) 100%)',
                border: '1px dashed rgba(79,209,197,0.3)',
              }}
            >
              <p className="text-3xl mb-3">🏗️</p>
              <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text)' }}>No project blueprint yet</p>
              <p className="text-xs mb-5" style={{ color: 'var(--muted2)' }}>
                Let AI generate a detailed, step-by-step project blueprint tailored to your team&apos;s skills and problem statement.
              </p>
              <button
                onClick={generateBlueprint}
                disabled={generatingBlueprint}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, var(--teal), rgba(232,201,122,0.8))', color: 'var(--ink)' }}
              >
                {generatingBlueprint ? (
                  <>
                    <span className="spin-ring w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ border: '2px solid rgba(8,9,15,0.3)', borderTopColor: 'var(--ink)' }} />
                    Generating Blueprint…
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    Generate Project Blueprint
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Team Complementarity */}
        {complementarity && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🧩</span>
              <h2 className="text-base font-bold uppercase tracking-widest" style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>
                Team Skill Coverage
              </h2>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold ml-1"
                style={{ background: 'rgba(232,201,122,0.1)', color: 'var(--gold)', border: '1px solid var(--gold-md)' }}
              >
                {complementarity.score}/100 complementarity
              </span>
            </div>
            <div className="rounded-2xl p-5 mb-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="flex flex-wrap gap-2 mb-4">
                {complementarity.coverage.map((c) => (
                  <div key={c.category} className="px-3 py-2 rounded-xl text-xs" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <span className="font-semibold" style={{ color: 'var(--teal)' }}>{c.category}</span>
                    <span className="ml-2" style={{ color: 'var(--muted2)' }}>{c.members.join(', ')}</span>
                  </div>
                ))}
              </div>
              {complementarity.gaps.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>Uncovered areas:</span>
                  {complementarity.gaps.map((g) => (
                    <span key={g} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,107,129,0.1)', color: 'var(--err)' }}>{g}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Peer Review */}
        {teamMembers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🤝</span>
              <h2 className="text-base font-bold uppercase tracking-widest" style={{ color: 'var(--teal)', fontFamily: 'var(--font-mono)' }}>
                Peer Review
              </h2>
            </div>

            {collabScores.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {collabScores.map((cs) => (
                  <div key={cs.revieweeId} className="rounded-xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <p className="text-xs truncate" style={{ color: 'var(--muted2)' }}>{cs.fullName}</p>
                    <p className="text-xl font-bold mt-1" style={{ color: 'var(--gold)' }}>{cs.overallScore.toFixed(1)}/5</p>
                    <p className="text-[10px]" style={{ color: 'var(--muted)' }}>{cs.reviewCount} review{cs.reviewCount !== 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4">
              {teamMembers.map((m) => {
                const r = ratings[m.userId] || { contribution: 3, communication: 3, technical: 3, comment: '' }
                const isSaved = savedReview.has(m.userId)
                return (
                  <div key={m.userId} className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>{m.name}</h3>
                      {isSaved && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(79,209,197,0.1)', color: 'var(--teal)' }}>✓ Rated</span>}
                    </div>
                    {(['contribution', 'communication', 'technical'] as const).map((field) => (
                      <div key={field} className="flex items-center justify-between mb-2">
                        <span className="text-xs capitalize" style={{ color: 'var(--muted2)' }}>{field}</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setRating(m.userId, field, star)}
                              className="text-lg leading-none"
                              style={{ color: star <= r[field] ? 'var(--gold)' : 'var(--border)' }}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <textarea
                      value={r.comment}
                      onChange={(e) => setComment(m.userId, e.target.value)}
                      placeholder="Optional comment..."
                      rows={2}
                      className="w-full p-2 rounded-lg text-xs mt-2 mb-3"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    />
                    <button
                      onClick={() => submitReview(m.userId)}
                      disabled={savingReview === m.userId}
                      className="w-full py-2 rounded-lg text-xs font-semibold"
                      style={{ background: 'var(--gold)', color: 'var(--ink)', opacity: savingReview === m.userId ? 0.6 : 1 }}
                    >
                      {savingReview === m.userId ? 'Saving…' : isSaved ? 'Update Rating' : 'Submit Rating'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Personal Analysis */}
        {personalSections.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">👤</span>
              <h2 className="text-base font-bold uppercase tracking-widest" style={{ color: 'var(--teal)', fontFamily: 'var(--font-mono)' }}>
                Personal Analysis
              </h2>
            </div>
            <div className="space-y-4">
              {personalSections.map((sec, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-5"
                  style={{ background: 'var(--card)', border: '1px solid rgba(79,209,197,0.15)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{getIcon(sec.heading)}</span>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>{sec.heading}</h3>
                  </div>
                  <ul className="space-y-2">
                    {sec.body.map((line, j) => (
                      <li key={j} className="flex gap-2 text-sm leading-relaxed" style={{ color: 'var(--muted2)' }}>
                        <span className="mt-1 shrink-0" style={{ color: 'var(--teal)' }}>•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Empty state */}
        {teamSections.length === 0 && personalSections.length === 0 && (
          <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <p className="text-4xl mb-3">📭</p>
            <p className="font-semibold" style={{ color: 'var(--text)' }}>No analysis content yet</p>
            <p className="text-sm mt-1" style={{ color: 'var(--muted2)' }}>Run the AI analysis from your hackathon page first.</p>
          </div>
        )}


        {/* End of PDF-captured region */}
        </div>

        {/* Regenerate Blueprint (outside PDF region — interactive control) */}
        {blueprintSections.length > 0 && (
          <div className="print-hide">
            <button
              onClick={generateBlueprint}
              disabled={generatingBlueprint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: 'var(--surface)', border: '1px solid rgba(79,209,197,0.3)', color: 'var(--teal)' }}
            >
              {generatingBlueprint ? (
                <>
                  <span className="spin-ring w-3 h-3 rounded-full flex-shrink-0" style={{ border: '2px solid rgba(79,209,197,0.2)', borderTopColor: 'var(--teal)' }} />
                  Regenerating…
                </>
              ) : (
                <>
                  <span>🔄</span>
                  Regenerate Blueprint
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </AppShell>
  )
}
