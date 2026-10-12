'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { TopBar } from '@/components/layout/TopBar'
import { useAppStore } from '@/store/appStore'
import { Hackathon } from '@/types'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface ProfileSuggestion {
  id: string
  full_name: string
  email: string
  username: string
  avatar_url?: string
}

interface HackathonInvite {
  id: string
  hackathon_id: string
  inviter_id: string
  invitee_id: string
  invitee_email: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  hackathon?: { team_name: string; problem_statement: string }
  inviter?: { full_name: string; email: string }
  invitee?: { full_name: string; email: string }
}

function parseProblemStatement(text: string): { description: string; neededSkills: string[] } {
  if (!text) return { description: '', neededSkills: [] }
  const match = text.match(/(.*)\s*\[Looking for:\s*(.*)\]\s*$/i)
  if (match) {
    const description = match[1].trim()
    const neededSkills = match[2].split(',').map(s => s.trim()).filter(Boolean)
    return { description, neededSkills }
  }
  return { description: text, neededSkills: [] }
}

// ─────────────────────────────────────────────
// MyHackathonBanner
// ─────────────────────────────────────────────
function MyHackathonBanner({
  hack,
  currentUserId,
  onDismiss,
  onAnalyze,
}: {
  hack: Hackathon
  currentUserId: string
  onDismiss: (h: Hackathon) => void
  onAnalyze: (h: Hackathon) => void
}) {
  const router = useRouter()
  const done = hack.members.filter((m) => m.inviteAccepted !== false).length
  const total = hack.members.length
  const allReady = done === total && total > 0
  const isOwner = hack.userId === currentUserId
  const isFinished = hack.attendedAt
    ? new Date(hack.attendedAt) < new Date(new Date().toDateString())
    : false

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(232,201,122,0.08) 0%, rgba(79,209,197,0.06) 100%)',
        border: '1.5px solid rgba(232,201,122,0.35)',
        boxShadow: '0 0 32px rgba(232,201,122,0.07)',
      }}
    >
      {/* Header band */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ background: 'rgba(232,201,122,0.10)', borderBottom: '1px solid rgba(232,201,122,0.2)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>
            My Hackathon
          </span>
          {isFinished && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase"
              style={{ background: 'rgba(255,107,129,0.12)', color: 'var(--err)', border: '1px solid rgba(255,107,129,0.3)' }}
            >
              Finished
            </span>
          )}
        </div>
        <button
          onClick={() => {
            const msg = 'Delete this hackathon? This will remove it for ALL team members and cannot be undone.'
            if (window.confirm(msg)) onDismiss(hack)
          }}
          className="text-xs px-3 py-1 rounded-full font-semibold transition-opacity opacity-50 hover:opacity-100"
          style={{ background: 'rgba(255,107,129,0.10)', color: 'var(--err)', border: '1px solid rgba(255,107,129,0.25)' }}
        >
          Delete Team
        </button>
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--font-playfair)' }}>
              {hack.teamName}
            </h2>
            {hack.attendedAt && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted2)', fontFamily: 'var(--font-mono)' }}>
                📅{' '}
                {new Date(hack.attendedAt).toLocaleDateString(undefined, {
                  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                })}
              </p>
            )}
          </div>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{
              background: allReady ? 'rgba(79,209,197,0.1)' : 'rgba(232,201,122,0.1)',
              color: allReady ? 'var(--teal)' : 'var(--gold)',
              border: `1px solid ${allReady ? 'rgba(79,209,197,0.3)' : 'rgba(232,201,122,0.3)'}`,
            }}
          >
            {allReady ? '✓ READY' : 'TESTS PENDING'}
          </span>
        </div>

        <p className="text-sm mb-3 leading-relaxed" style={{ color: 'var(--text)' }}>
          {parseProblemStatement(hack.problemStatement).description}
        </p>

        {parseProblemStatement(hack.problemStatement).neededSkills.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] mb-1.5 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>Looking For:</p>
            <div className="flex flex-wrap gap-1.5">
              {parseProblemStatement(hack.problemStatement).neededSkills.map((s) => (
                <span key={s} className="text-[10px] px-2.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(79,209,197,0.1)', color: 'var(--teal)', border: '1px solid rgba(79,209,197,0.2)' }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Team readiness bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
              Team Readiness
            </p>
            <p className="text-xs font-bold" style={{ color: 'var(--gold)' }}>
              {done}/{total}
            </p>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: total > 0 ? `${(done / total) * 100}%` : '0%',
                background: allReady ? 'var(--teal)' : 'var(--gold)',
              }}
            />
          </div>
        </div>

        {/* Member pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {hack.members.map((m) => (
            <div
              key={m.email}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
              style={{
                background: m.inviteAccepted === false ? 'rgba(255,255,255,0.03)' : (m.testCompleted ? 'rgba(79,209,197,0.1)' : 'var(--surface)'),
                color: m.inviteAccepted === false ? 'var(--muted)' : (m.testCompleted ? 'var(--teal)' : 'var(--muted2)'),
                border: `1px solid ${m.inviteAccepted === false ? 'rgba(255,255,255,0.1)' : (m.testCompleted ? 'rgba(79,209,197,0.3)' : 'var(--border)')}`,
              }}
            >
              <span>{m.inviteAccepted === false ? '⏳' : '✓'}</span>
              <span>{m.name || m.email}</span>
              {m.userId === hack.userId && (
                <span
                  className="text-[9px] uppercase tracking-wider ml-1 px-1.5 py-0.5 rounded font-bold"
                  style={{ background: 'rgba(232,201,122,0.15)', color: 'var(--gold)' }}
                >
                  Leader
                </span>
              )}
              {m.userId === currentUserId && (
                <span
                  className="text-[9px] uppercase tracking-wider ml-1 px-1.5 py-0.5 rounded opacity-80"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                >
                  You
                </span>
              )}
              {m.inviteAccepted === false && (
                <span className="text-[9px] uppercase tracking-wider ml-0.5 opacity-70">
                  (Pending)
                </span>
              )}
            </div>
          ))}
        </div>

        {hack.analysisComplete && hack.teamAnalysis && (
          <button
            onClick={() => router.push(`/hackathon/analysis/${hack.id}`)}
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
            style={{ background: 'linear-gradient(135deg, rgba(232,201,122,0.15), rgba(79,209,197,0.1))', color: 'var(--gold)', border: '1px solid rgba(232,201,122,0.3)' }}
          >
            📊 View Full AI Analysis
          </button>
        )}

        {allReady && !hack.analysisComplete && (
          <button
            onClick={() => onAnalyze(hack)}
            className="w-full py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--gold)', color: 'var(--ink)' }}
          >
            ⚡ Run AI Analysis
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// HackCard — compact card for additional teams
// ─────────────────────────────────────────────
function HackCard({
  hack,
  isOwner,
  currentUserId,
  onAnalyze,
  onDismiss,
}: {
  hack: Hackathon
  isOwner: boolean
  currentUserId: string
  onAnalyze: (h: Hackathon) => void
  onDismiss?: (h: Hackathon) => void
}) {
  const router = useRouter()
  const done = hack.members.filter((m) => m.inviteAccepted !== false).length
  const total = hack.members.length
  const allReady = done === total && total > 0

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-base" style={{ color: 'var(--gold)', fontFamily: 'var(--font-playfair)' }}>
            {hack.teamName}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted2)', fontFamily: 'var(--font-mono)' }}>
            {new Date(hack.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-2 py-1 rounded-full font-semibold"
            style={{
              background: allReady ? 'rgba(79,209,197,0.1)' : 'rgba(232,201,122,0.1)',
              color: allReady ? 'var(--teal)' : 'var(--gold)',
              border: `1px solid ${allReady ? 'rgba(79,209,197,0.3)' : 'rgba(232,201,122,0.3)'}`,
            }}
          >
            {allReady ? 'READY' : 'TESTS PENDING'}
          </span>
          {onDismiss && (
            <button
              onClick={() => {
                const msg = 'Delete this hackathon team? This will remove it for ALL members.'
                if (window.confirm(msg)) onDismiss(hack)
              }}
              className="text-xs px-2 py-1 rounded-full font-semibold transition-opacity opacity-50 hover:opacity-100"
              style={{ background: 'rgba(255,107,129,0.1)', color: 'var(--err)', border: '1px solid rgba(255,107,129,0.3)' }}
              title="Delete Team"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <p className="text-sm mb-3 leading-relaxed" style={{ color: 'var(--text)' }}>
        {parseProblemStatement(hack.problemStatement).description}
      </p>

      {parseProblemStatement(hack.problemStatement).neededSkills.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] mb-1.5 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>Looking For:</p>
          <div className="flex flex-wrap gap-1.5">
            {parseProblemStatement(hack.problemStatement).neededSkills.map((s) => (
              <span key={s} className="text-[10px] px-2.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(79,209,197,0.1)', color: 'var(--teal)', border: '1px solid rgba(79,209,197,0.2)' }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
            Team readiness
          </p>
          <p className="text-xs font-bold" style={{ color: 'var(--gold)' }}>{done}/{total}</p>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: total > 0 ? `${(done / total) * 100}%` : '0%', background: 'var(--gold)' }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {hack.members.map((m) => (
          <div
            key={m.email}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full"
            style={{
              background: m.inviteAccepted === false ? 'rgba(255,255,255,0.03)' : (m.testCompleted ? 'rgba(79,209,197,0.1)' : 'var(--surface)'),
              color: m.inviteAccepted === false ? 'var(--muted)' : (m.testCompleted ? 'var(--teal)' : 'var(--muted2)'),
              border: `1px solid ${m.inviteAccepted === false ? 'rgba(255,255,255,0.1)' : 'var(--border)'}`,
            }}
          >
            <span>{m.inviteAccepted === false ? '⏳' : (m.testCompleted ? '✓' : '○')}</span>
            <span>{m.name || m.email}</span>
            {m.userId === currentUserId && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ml-0.5" style={{ background: 'rgba(232,201,122,0.2)', color: 'var(--gold)' }}>
                you
              </span>
            )}
            {m.inviteAccepted === false && (
              <span className="text-[9px] uppercase tracking-wider ml-0.5 opacity-70">
                (Pending)
              </span>
            )}
          </div>
        ))}
      </div>

      {hack.analysisComplete && hack.teamAnalysis && (
        <button
          onClick={() => router.push(`/hackathon/analysis/${hack.id}`)}
          className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
          style={{ background: 'linear-gradient(135deg, rgba(232,201,122,0.15), rgba(79,209,197,0.1))', color: 'var(--gold)', border: '1px solid rgba(232,201,122,0.3)' }}
        >
          📊 View Full AI Analysis
        </button>
      )}

      {allReady && !hack.analysisComplete && (
        <button onClick={() => onAnalyze(hack)} className="w-full py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--gold)', color: 'var(--ink)' }}>
          ⚡ Run AI Analysis
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// MemberSearchInput
// ─────────────────────────────────────────────
function MemberSearchInput({ onAdd, alreadyAdded }: { onAdd: (p: ProfileSuggestion) => void; alreadyAdded: string[] }) {
  const [searchMode, setSearchMode] = useState<'name' | 'email'>('name')
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (query.trim().length === 0) { setSuggestions([]); setOpen(false); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const col = searchMode === 'name' ? 'full_name' : 'email'
        const { data } = await supabase.from('profiles').select('id, full_name, email, username, avatar_url').ilike(col, `${query}%`).limit(8)
        const filtered = (data || []).filter((p: ProfileSuggestion) => !alreadyAdded.includes(p.id))
        setSuggestions(filtered)
        setOpen(filtered.length > 0)
      } catch (err) { console.error('Search failed', err) }
      setLoading(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [query, searchMode, alreadyAdded])

  const pick = (p: ProfileSuggestion) => { onAdd(p); setQuery(''); setSuggestions([]); setOpen(false) }

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex gap-2 mb-2">
        {(['name', 'email'] as const).map((m) => (
          <button key={m} type="button"
            onClick={() => { setSearchMode(m); setQuery(''); setSuggestions([]); setOpen(false) }}
            className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
            style={{ background: searchMode === m ? 'var(--gold)' : 'var(--surface)', color: searchMode === m ? 'var(--ink)' : 'var(--muted2)', border: '1px solid var(--border)' }}
          >
            By {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>
      <div className="relative flex items-center">
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={searchMode === 'name' ? 'Type a name…' : 'Type an email…'}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none pr-10"
          style={{ background: 'var(--surface)', border: '1px solid var(--rim)', color: 'var(--text)' }}
        />
        {loading && <div className="absolute right-3 w-4 h-4 rounded-full spin-ring" style={{ border: '2px solid var(--border)', borderTopColor: 'var(--gold)' }} />}
      </div>
      {open && (
        <div className="absolute left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 shadow-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {suggestions.map((p) => (
            <button key={p.id} type="button" onClick={() => pick(p)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
              style={{ borderBottom: '1px solid var(--border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: 'var(--gold)', color: 'var(--ink)' }}>
                {p.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{p.full_name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--muted2)' }}>{p.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// NewHackathonModal
// ─────────────────────────────────────────────
function NewHackathonModal({ onClose, onAdd }: { onClose: () => void; onAdd: (h: Hackathon) => void }) {
  const { profile } = useAppStore()
  const [teamName, setTeamName] = useState('')
  const [problemStatement, setProblemStatement] = useState('')
  const [neededSkillsStr, setNeededSkillsStr] = useState('')
  const [oldIdea, setOldIdea] = useState('')
  const [attendedAt, setAttendedAt] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<ProfileSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')

  // ── Calendar picker state ──────────────────────────────────────────────
  const [calOpen, setCalOpen] = useState(false)
  const today = new Date()
  const [calYear,  setCalYear]  = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth()) // 0-indexed
  const calRef = useRef<HTMLDivElement>(null)

  // Close calendar on outside click
  useEffect(() => {
    if (!calOpen) return
    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) setCalOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [calOpen])

  const MONTH_NAMES = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December']
  const DAY_LABELS  = ['Su','Mo','Tu','We','Th','Fr','Sa']

  // Days in the displayed month (handles 28/29/30/31 correctly)
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate() // 1–31
  // Weekday of the 1st (0=Sun)
  const firstDow = new Date(calYear, calMonth, 1).getDay()

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  const pickDay = (day: number) => {
    // month is 0-indexed → pad to 2 digits with +1
    const mm = String(calMonth + 1).padStart(2, '0')  // 01–12
    const dd = String(day).padStart(2, '0')            // 01–31
    setAttendedAt(`${calYear}-${mm}-${dd}`)
    setCalOpen(false)
  }

  // Parse selected date for highlight
  const selParts = attendedAt ? attendedAt.split('-') : null
  const selY = selParts ? parseInt(selParts[0]) : null
  const selM = selParts ? parseInt(selParts[1]) - 1 : null   // 0-indexed
  const selD = selParts ? parseInt(selParts[2]) : null

  // Display string DD/MM/YYYY
  const displayDate = attendedAt
    ? `${String(selD).padStart(2,'0')}/${String((selM ?? 0)+1).padStart(2,'0')}/${selY}`
    : ''

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const addMember = (p: ProfileSuggestion) => {
    if (p.id === profile?.id) { showToast("That's you — you're already the team leader!"); return }
    setSelectedMembers((prev) => [...prev, p])
  }
  const removeMember = (id: string) => setSelectedMembers((prev) => prev.filter((p) => p.id !== id))

  const handleCreate = async () => {
    if (!teamName || !problemStatement || !attendedAt) {
      showToast('Please fill in all required fields including the Hackathon Date.')
      return
    }
    setLoading(true)
    try {
      const finalProblemStatement = neededSkillsStr.trim() 
        ? `${problemStatement} [Looking for: ${neededSkillsStr.trim()}]` 
        : problemStatement

      const { data: newHack, error: hackErr } = await supabase
        .from('hackathons')
        .insert({ user_id: profile?.id || '', team_name: teamName, problem_statement: finalProblemStatement, old_idea: oldIdea || null, attended_at: attendedAt || null, analysis_complete: false })
        .select('id, created_at')
        .single()

      if (hackErr || !newHack) throw new Error(hackErr?.message || 'Failed to create hackathon')
      const hackId = newHack.id

      // Insert members: creator is immediately accepted (invite_accepted = true)
      // Invitees have invite_accepted = false until they accept
      const memberRows = [
        { hackathon_id: hackId, user_id: profile?.id || null, email: profile?.email || '', name: profile?.full_name || null, test_completed: true, invite_accepted: true },
        ...selectedMembers.map((m) => ({
          hackathon_id: hackId, user_id: m.id, email: m.email, name: m.full_name || null, test_completed: false, invite_accepted: false,
        })),
      ]
      const { error: insertErr } = await supabase.from('hackathon_members').insert(memberRows)
      if (insertErr) {
        console.error('Failed to insert members:', insertErr)
        alert('Database Error inserting members: ' + insertErr.message + '\\nCode: ' + insertErr.code)
      }

      for (const m of selectedMembers) {
        const { error: inviteErr } = await supabase.from('hackathon_invites').insert({
          hackathon_id: hackId, inviter_id: profile?.id, invitee_id: m.id, invitee_email: m.email, status: 'pending',
        })
        if (inviteErr) console.error('Invite insert error:', inviteErr)
      }

      const hack: Hackathon = {
        id: hackId, userId: profile?.id || '', teamName, problemStatement, oldIdea, attendedAt,
        analysisComplete: false, createdAt: newHack.created_at,
        members: [
          { email: profile?.email || '', name: profile?.full_name || '', testCompleted: true, userId: profile?.id, inviteAccepted: true },
          ...selectedMembers.map((m) => ({ email: m.email, name: m.full_name, testCompleted: false, userId: m.id, inviteAccepted: false })),
        ],
      }
      onAdd(hack)
    } catch (err) {
      console.error('Failed to create hackathon:', err)
      showToast('Failed to create hackathon. Please try again.')
    }
    setLoading(false)
    onClose()
  }

  const alreadyAddedIds = [profile?.id || '', ...selectedMembers.map((m) => m.id)]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(8,9,15,0.8)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-lg rounded-3xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--gold)' }}>New Hackathon</h2>
          <button onClick={onClose} style={{ color: 'var(--muted2)' }}>✕</button>
        </div>

        {toast && (
          <div className="mb-4 px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: 'rgba(232,201,122,0.1)', color: 'var(--gold)', border: '1px solid rgba(232,201,122,0.3)' }}>
            {toast}
          </div>
        )}

        <div className="space-y-4">
          {[
            { label: 'Team Name *', value: teamName, set: setTeamName, placeholder: 'e.g. ByteBuilders' },
            { label: 'Problem Statement *', value: problemStatement, set: setProblemStatement, placeholder: 'What problem are you solving?' },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{label}</label>
              <input type="text" value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--rim)', color: 'var(--text)' }}
              />
            </div>
          ))}

          <div>
            <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>Skills Needed (optional)</label>
            <input type="text" value={neededSkillsStr} onChange={(e) => setNeededSkillsStr(e.target.value)} placeholder="e.g. React.js, Node.js, Python"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--rim)', color: 'var(--text)' }}
            />
            <p className="text-[10px] mt-1" style={{ color: 'var(--muted2)' }}>
              Enter comma-separated skills to display on the Hackathon Finder.
            </p>
          </div>

          {/* ── Hackathon Date — custom calendar picker ── */}
          <div ref={calRef} style={{ position: 'relative' }}>
            <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>Hackathon Date *</label>

            {/* Trigger field */}
            <button
              type="button"
              onClick={() => setCalOpen(o => !o)}
              className="w-full px-4 py-3 rounded-xl text-sm text-left flex items-center justify-between"
              style={{
                background: 'var(--surface)',
                border: `1px solid ${!attendedAt ? 'rgba(255,107,129,0.4)' : calOpen ? 'var(--gold)' : 'var(--rim)'}`,
                color: attendedAt ? 'var(--text)' : 'var(--muted)',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
            >
              <span>{displayDate || 'Pick a date…'}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ color: 'var(--muted)', flexShrink: 0 }}>
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
            </button>

            {!attendedAt && (
              <p className="text-[10px] mt-1" style={{ color: 'rgba(255,107,129,0.8)' }}>Required — the team will be auto-deleted after this date.</p>
            )}

            {/* Calendar dropdown */}
            {calOpen && (
              <div
                style={{
                  position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
                  width: '300px',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '16px',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
                  animation: 'fadeIn 0.15s ease',
                }}
              >
                {/* Month / Year navigation */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <button type="button" onClick={prevMonth}
                    style={{ width: 28, height: 28, borderRadius: '8px', background: 'var(--surface)',
                      border: '1px solid var(--border)', color: 'var(--muted2)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                    ‹
                  </button>
                  <span style={{ fontFamily: 'var(--font-playfair)', color: 'var(--gold)', fontWeight: 700, fontSize: '14px' }}>
                    {MONTH_NAMES[calMonth]} {calYear}
                  </span>
                  <button type="button" onClick={nextMonth}
                    style={{ width: 28, height: 28, borderRadius: '8px', background: 'var(--surface)',
                      border: '1px solid var(--border)', color: 'var(--muted2)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                    ›
                  </button>
                </div>

                {/* Day-of-week headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
                  {DAY_LABELS.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontFamily: 'var(--font-mono)',
                      color: 'var(--muted)', paddingBottom: '4px', fontWeight: 600 }}>
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day grid — days 1–(daysInMonth), constrained to real days in month */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                  {/* Empty cells for offset */}
                  {Array.from({ length: firstDow }).map((_, i) => (
                    <div key={`e${i}`} />
                  ))}

                  {/* Day cells — 01 to daysInMonth (max 31, real max is what the month has) */}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const isSelected = selY === calYear && selM === calMonth && selD === day
                    const isToday = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => pickDay(day)}
                        style={{
                          width: '100%', aspectRatio: '1',
                          borderRadius: '8px',
                          border: isToday && !isSelected ? '1px solid rgba(232,201,122,0.4)' : '1px solid transparent',
                          background: isSelected
                            ? 'var(--gold)'
                            : 'transparent',
                          color: isSelected ? 'var(--ink)' : isToday ? 'var(--gold)' : 'var(--text)',
                          fontWeight: isSelected || isToday ? 700 : 400,
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'background 0.15s, transform 0.1s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)' }}
                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                      >
                        {String(day).padStart(2, '0')}
                      </button>
                    )
                  })}
                </div>

                {/* Month/year quick selectors */}
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)',
                  display: 'flex', gap: '8px' }}>
                  {/* Month selector: 1–12 */}
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--muted)',
                      textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>Month</label>
                    <select
                      value={calMonth}
                      onChange={e => setCalMonth(Number(e.target.value))}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '8px',
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        color: 'var(--text)', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                    >
                      {MONTH_NAMES.map((name, i) => (
                        <option key={i} value={i}>{String(i + 1).padStart(2,'0')} – {name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Year selector */}
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--muted)',
                      textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>Year</label>
                    <select
                      value={calYear}
                      onChange={e => setCalYear(Number(e.target.value))}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '8px',
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        color: 'var(--text)', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                    >
                      {Array.from({ length: 6 }, (_, i) => today.getFullYear() + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Previous Idea — now below Date */}
          <div>
            <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>Previous Idea (optional)</label>
            <input type="text" value={oldIdea} onChange={(e) => setOldIdea(e.target.value)} placeholder="Any old idea you are building on?"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--rim)', color: 'var(--text)' }}
            />
          </div>

          <div>
            <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>Add Team Members</label>
            <MemberSearchInput onAdd={addMember} alreadyAdded={alreadyAddedIds} />
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedMembers.map((m) => (
                  <div key={m.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{ background: 'rgba(232,201,122,0.1)', color: 'var(--gold)', border: '1px solid rgba(232,201,122,0.3)' }}
                  >
                    <span>{m.full_name}</span>
                    <button type="button" onClick={() => removeMember(m.id)} className="ml-1 text-xs leading-none opacity-60 hover:opacity-100">✕</button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
              Members will get a request in their <strong style={{ color: 'var(--teal)' }}>Requests</strong> tab. The team appears in their{' '}
              <strong style={{ color: 'var(--gold)' }}>My Hackathon</strong> once they accept.
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            Cancel
          </button>
          <button onClick={handleCreate} disabled={loading || !teamName || !problemStatement}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'var(--gold)', color: 'var(--ink)', opacity: !teamName || !problemStatement ? 0.5 : 1 }}
          >
            {loading ? 'Creating…' : 'Create & Send Invites'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// RequestsTab
// ─────────────────────────────────────────────
function RequestsTab({ profileId, onAccepted }: { profileId: string; onAccepted: () => Promise<void> }) {
  const [incoming, setIncoming] = useState<HackathonInvite[]>([])
  const [sent, setSent] = useState<HackathonInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)

  const loadInvites = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('hackathon_invites')
        .select(`
          id, hackathon_id, inviter_id, invitee_id, invitee_email, status, created_at,
          hackathons ( team_name, problem_statement ),
          inviter:profiles!hackathon_invites_inviter_id_fkey ( full_name, email ),
          invitee:profiles!hackathon_invites_invitee_id_fkey ( full_name, email )
        `)
        .or(`invitee_id.eq.${profileId},inviter_id.eq.${profileId}`)
        .order('created_at', { ascending: false })

      if (error) { console.error('Failed to load invites:', error); return }

      const formatted: HackathonInvite[] = (data || []).map((row: any) => ({
        id: row.id, hackathon_id: row.hackathon_id, inviter_id: row.inviter_id,
        invitee_id: row.invitee_id, invitee_email: row.invitee_email,
        status: row.status, created_at: row.created_at,
        hackathon: row.hackathons ? { team_name: row.hackathons.team_name, problem_statement: row.hackathons.problem_statement } : undefined,
        inviter: row.inviter ? { full_name: row.inviter.full_name, email: row.inviter.email } : undefined,
        invitee: row.invitee ? { full_name: row.invitee.full_name, email: row.invitee.email } : undefined,
      }))

      setIncoming(formatted.filter((i) => i.invitee_id === profileId && i.status === 'pending'))
      setSent(formatted.filter((i) => i.inviter_id === profileId))
    } finally {
      setLoading(false)
    }
  }, [profileId])

  useEffect(() => { loadInvites() }, [loadInvites])

  const respond = async (invite: HackathonInvite, action: 'accepted' | 'declined') => {
    setResponding(invite.id)
    try {
      // 1. Update invite status
      const { error: updErr } = await supabase
        .from('hackathon_invites')
        .update({ status: action, responded_at: new Date().toISOString() })
        .eq('id', invite.id)

      if (updErr) { alert('Failed to respond: ' + updErr.message); setResponding(null); return }

      if (action === 'accepted') {
        // Fix: Determine target user based on who owns the hackathon
        const { data: hackData } = await supabase.from('hackathons').select('user_id').eq('id', invite.hackathon_id).single()
        const ownerId = hackData?.user_id
        const targetUserId = invite.inviter_id === ownerId ? invite.invitee_id : invite.inviter_id
        
        const { data: existingMember } = await supabase
          .from('hackathon_members')
          .select('id')
          .eq('hackathon_id', invite.hackathon_id)
          .eq('user_id', targetUserId)
          .single()

        if (existingMember) {
          const { error: memErr } = await supabase
            .from('hackathon_members')
            .update({ invite_accepted: true })
            .eq('id', existingMember.id)
          if (memErr) console.error('Member update error:', memErr)
        } else {
          // If candidate applied: insert a new row in hackathon_members
          const { error: memErr } = await supabase
            .from('hackathon_members')
            .insert({
              hackathon_id: invite.hackathon_id,
              user_id: targetUserId,
              email: invite.inviter?.email || invite.invitee_email,
              name: invite.inviter?.full_name || null,
              test_completed: true,
              invite_accepted: true
            })
          if (memErr) console.error('Member insert error:', memErr)
        }

        // 3. Reload the hackathons list (awaited!) then switch tab
        await onAccepted()
      } else {
        // Declined: remove member row entirely
        const { data: hackData } = await supabase.from('hackathons').select('user_id').eq('id', invite.hackathon_id).single()
        const ownerId = hackData?.user_id
        const targetUserId = invite.inviter_id === ownerId ? invite.invitee_id : invite.inviter_id
        await supabase
          .from('hackathon_members')
          .delete()
          .eq('hackathon_id', invite.hackathon_id)
          .eq('user_id', targetUserId)
      }

      setIncoming((prev) => prev.filter((i) => i.id !== invite.id))
    } catch (err) {
      console.error('Failed to respond to invite:', err)
    }
    setResponding(null)
  }

  const cancelRequest = async (invite: HackathonInvite) => {
    setResponding(invite.id)
    try {
      const { error } = await supabase.from('hackathon_invites').delete().eq('id', invite.id)
      if (error) { alert('Failed to cancel: ' + error.message); setResponding(null); return }
      await supabase.from('hackathon_members').delete()
        .eq('hackathon_id', invite.hackathon_id).eq('user_id', invite.invitee_id)
      setSent((prev) => prev.filter((i) => i.id !== invite.id))
    } catch (err) { console.error('Failed to cancel request:', err) }
    setResponding(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="spin-ring w-8 h-8 rounded-full" style={{ border: '3px solid var(--border)', borderTopColor: 'var(--gold)' }} />
      </div>
    )
  }

  if (incoming.length === 0 && sent.length === 0) {
    return (
      <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <p className="text-4xl mb-4">📬</p>
        <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>No pending requests</p>
        <p className="text-sm" style={{ color: 'var(--muted2)' }}>
          Team invites will show up here when someone adds you to their hackathon.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {incoming.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>
            Incoming Requests
          </h2>
          {incoming.map((inv) => (
            <div key={inv.id} className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-base" style={{ color: 'var(--gold)', fontFamily: 'var(--font-playfair)' }}>
                    {inv.hackathon?.team_name || 'Unknown Team'}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted2)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(inv.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: 'rgba(232,201,122,0.1)', color: 'var(--gold)', border: '1px solid rgba(232,201,122,0.3)' }}>
                  PENDING
                </span>
              </div>
              <p className="text-xs mb-2" style={{ color: 'var(--muted2)' }}>
                Invited by{' '}
                <span style={{ color: 'var(--teal)', fontWeight: 600 }}>{inv.inviter?.full_name || inv.inviter?.email || 'Unknown'}</span>
              </p>
              <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--text)' }}>{inv.hackathon?.problem_statement || '—'}</p>
              <div className="flex gap-3">
                <button onClick={() => respond(inv, 'declined')} disabled={responding === inv.id}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: 'var(--surface)', color: 'var(--muted2)', border: '1px solid var(--border)', opacity: responding === inv.id ? 0.5 : 1 }}
                >
                  Decline
                </button>
                <button onClick={() => respond(inv, 'accepted')} disabled={responding === inv.id}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: 'var(--gold)', color: 'var(--ink)', opacity: responding === inv.id ? 0.5 : 1 }}
                >
                  {responding === inv.id ? 'Accepting…' : '✓ Accept'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sent.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--muted2)', fontFamily: 'var(--font-mono)' }}>
            Sent Requests
          </h2>
          {sent.map((inv) => (
            <div key={inv.id} className="rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  To: <span style={{ color: 'var(--teal)' }}>{inv.invitee?.full_name || inv.invitee_email}</span>
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted2)' }}>
                  Team: {inv.hackathon?.team_name || 'Unknown'} • Status:{' '}
                  <span style={{ color: inv.status === 'pending' ? 'var(--gold)' : inv.status === 'accepted' ? 'var(--teal)' : 'var(--err)' }}>
                    {inv.status.toUpperCase()}
                  </span>
                </p>
              </div>
              {inv.status === 'pending' && (
                <button onClick={() => cancelRequest(inv)} disabled={responding === inv.id}
                  className="px-4 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: 'var(--card)', color: 'var(--err)', border: '1px solid rgba(255,107,129,0.2)', opacity: responding === inv.id ? 0.5 : 1 }}
                >
                  {responding === inv.id ? 'Canceling…' : 'Cancel Request'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// FinderTab — find other teams to apply to join
// ─────────────────────────────────────────────
interface FinderTeam {
  id: string
  userId: string
  teamName: string
  problemStatement: string
  description: string
  neededSkills: string[]
  attendedAt: string
  membersCount: number
  leaderName: string
  leaderEmail: string
  applicationStatus?: 'pending' | 'accepted' | 'declined' | null
  inviteId?: string
}

function FinderTab({ profileId }: { profileId: string }) {
  const [teams, setTeams] = useState<FinderTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState<string | null>(null)

  const loadFinderTeams = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Get my memberships
      const { data: myMems } = await supabase
        .from('hackathon_members')
        .select('hackathon_id')
        .eq('user_id', profileId)
      const myHackIds = new Set((myMems || []).map((m) => m.hackathon_id))

      // 2. Fetch all hackathons
      const { data: hacks, error: hacksErr } = await supabase
        .from('hackathons')
        .select('*')
        .order('created_at', { ascending: false })
      if (hacksErr) throw hacksErr

      // Filter out hackathons I am already in
      const availableHacks = (hacks || []).filter((h) => !myHackIds.has(h.id))

      if (availableHacks.length === 0) {
        setTeams([])
        return
      }

      // 3. Fetch leader profiles
      const leaderIds = Array.from(new Set(availableHacks.map((h) => h.user_id)))
      const { data: leaders } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', leaderIds)

      // 4. Fetch member counts
      const hackIds = availableHacks.map((h) => h.id)
      const { data: mems } = await supabase
        .from('hackathon_members')
        .select('hackathon_id')
        .in('hackathon_id', hackIds)

      // 5. Fetch my sent applications
      const { data: applications } = await supabase
        .from('hackathon_invites')
        .select('id, hackathon_id, status')
        .eq('inviter_id', profileId)

      const formatted = availableHacks.map((h: any) => {
        const leader = (leaders || []).find((l) => l.id === h.user_id)
        const count = (mems || []).filter((m) => m.hackathon_id === h.id).length
        const app = (applications || []).find((a) => a.hackathon_id === h.id)
        
        const { description, neededSkills } = parseProblemStatement(h.problem_statement)

        return {
          id: h.id,
          userId: h.user_id,
          teamName: h.team_name,
          problemStatement: h.problem_statement,
          description,
          neededSkills,
          attendedAt: h.attended_at,
          membersCount: count,
          leaderName: leader?.full_name || 'Leader',
          leaderEmail: leader?.email || '',
          applicationStatus: app?.status || null,
          inviteId: app?.id || null
        }
      })

      setTeams(formatted)
    } catch (err) {
      console.error('loadFinderTeams error:', err)
    } finally {
      setLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    loadFinderTeams()
  }, [loadFinderTeams])

  const applyToTeam = async (team: FinderTeam) => {
    if (!team.leaderEmail) {
      alert('Cannot apply: team leader email not found.')
      return
    }
    setApplying(team.id)
    try {
      const { error } = await supabase.from('hackathon_invites').insert({
        hackathon_id: team.id,
        inviter_id: profileId,
        invitee_id: team.userId,
        invitee_email: team.leaderEmail,
        status: 'pending'
      })
      if (error) {
        alert('Failed to apply: ' + error.message)
      } else {
        await loadFinderTeams()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setApplying(null)
    }
  }

  const cancelApplication = async (team: FinderTeam) => {
    if (!team.inviteId) return
    setApplying(team.id)
    try {
      const { error } = await supabase.from('hackathon_invites').delete().eq('id', team.inviteId)
      if (error) {
        alert('Failed to cancel: ' + error.message)
      } else {
        await loadFinderTeams()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setApplying(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="spin-ring w-8 h-8 rounded-full" style={{ border: '3px solid var(--border)', borderTopColor: 'var(--gold)' }} />
      </div>
    )
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <p className="text-4xl mb-4">🔍</p>
        <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>No teams looking for members</p>
        <p className="text-sm" style={{ color: 'var(--muted2)' }}>
          Check back later or create your own hackathon team!
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {teams.map((t) => {
        const isPending = t.applicationStatus === 'pending'
        const isDeclined = t.applicationStatus === 'declined'
        return (
          <div key={t.id} className="rounded-2xl p-5 flex flex-col justify-between gap-4 animate-in fade-in duration-200" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base" style={{ color: 'var(--gold)', fontFamily: 'var(--font-playfair)' }}>
                    {t.teamName}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted2)', fontFamily: 'var(--font-mono)' }}>
                    Leader: {t.leaderName}
                  </p>
                </div>
                {t.attendedAt && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: 'var(--surface)', color: 'var(--muted2)', border: '1px solid var(--border)' }}>
                    📅 {new Date(t.attendedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--text)' }}>
                {t.description}
              </p>

              {/* Skills Needed */}
              {t.neededSkills.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] mb-1.5 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
                    Looking For:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {t.neededSkills.map((s) => (
                      <span key={s} className="text-xs px-2.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(79,209,197,0.1)', color: 'var(--teal)', border: '1px solid rgba(79,209,197,0.2)' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--border)' }}>
              <span className="text-xs" style={{ color: 'var(--muted2)' }}>
                👥 {t.membersCount} {t.membersCount === 1 ? 'member' : 'members'}
              </span>

              {isDeclined ? (
                <button disabled className="px-5 py-2 rounded-xl text-xs font-semibold" style={{ background: 'var(--surface)', color: 'var(--err)', border: '1px solid rgba(255,107,129,0.2)', opacity: 0.6 }}>
                  Application Declined
                </button>
              ) : isPending ? (
                <button
                  onClick={() => cancelApplication(t)}
                  disabled={applying === t.id}
                  className="px-5 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
                  style={{ background: 'var(--card)', color: 'var(--err)', border: '1px solid rgba(255,107,129,0.3)' }}
                >
                  {applying === t.id ? 'Canceling...' : 'Pending (Cancel) ✕'}
                </button>
              ) : (
                <button
                  onClick={() => applyToTeam(t)}
                  disabled={applying === t.id}
                  className="px-5 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
                  style={{ background: 'var(--gold)', color: 'var(--ink)' }}
                >
                  {applying === t.id ? 'Applying...' : 'Apply to Join ⚡'}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
// HackathonPage — main export
// ─────────────────────────────────────────────
export default function HackathonPage() {
  const { profile, hackathons, setHackathons, addHackathon } = useAppStore()
  const [showModal, setShowModal] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState<'my-teams' | 'requests' | 'finder'>('my-teams')
  const [pendingCount, setPendingCount] = useState(0)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  // ── Core data loader — useCallback so it's stable and awaitable ──
  // KEY FIX: Only shows hackathons where invite_accepted = true for non-owners.
  // Creator's own row has invite_accepted = true from the start.
  const loadHackathons = useCallback(async () => {
    if (!profile) return

    try {
      // ── Step 1: Auto-delete expired hackathons the user OWNS ──
      const todayISO = new Date().toISOString().split('T')[0]
      await supabase
        .from('hackathons')
        .delete()
        .eq('user_id', profile.id)
        .not('attended_at', 'is', null)
        .lt('attended_at', todayISO)

      // ── Step 2a: Hackathons the user OWNS directly (always show these) ──
      const { data: ownedHacks } = await supabase
        .from('hackathons')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })

      // ── Step 2b: Hackathons where the user is an accepted member (not owner) ──
      const { data: myMemberships } = await supabase
        .from('hackathon_members')
        .select('hackathon_id')
        .eq('user_id', profile.id)
        .eq('invite_accepted', true)

      const ownedIds = new Set((ownedHacks || []).map((h: any) => h.id))
      const extraIds = (myMemberships || [])
        .map((m) => m.hackathon_id)
        .filter((id) => !ownedIds.has(id))

      let memberHacks: any[] = []
      if (extraIds.length > 0) {
        const { data } = await supabase
          .from('hackathons')
          .select('*')
          .in('id', extraIds)
          .order('created_at', { ascending: false })
        memberHacks = data || []
      }

      // ── Step 3: Merge owned + member hackathons ──
      const allHacks: any[] = [...(ownedHacks || []), ...memberHacks]
      if (allHacks.length === 0) { setHackathons([]); return }

      // ── Step 4: Load all members for every hackathon ──
      const { data: mems } = await supabase
        .from('hackathon_members')
        .select('*')
        .in('hackathon_id', allHacks.map((h) => h.id))

      // ── Step 5: Self-heal — ensure creator has invite_accepted = true ──
      for (const hack of (ownedHacks || [])) {
        const creatorRow = (mems || []).find(
          (m: any) => m.hackathon_id === hack.id && m.user_id === profile.id
        )
        if (!creatorRow) {
          // Creator row completely missing — insert it
          await supabase.from('hackathon_members').upsert({
            hackathon_id: hack.id,
            user_id: profile.id,
            email: profile.email,
            name: profile.full_name,
            test_completed: true,
            invite_accepted: true,
          }, { onConflict: 'hackathon_id,email' })
        } else if (!creatorRow.invite_accepted) {
          // Creator row exists but invite_accepted is false — fix it
          await supabase.from('hackathon_members')
            .update({ invite_accepted: true })
            .eq('hackathon_id', hack.id)
            .eq('user_id', profile.id)
        }
      }

      const formatted: Hackathon[] = allHacks.map((h: any) => {
        const hm = (mems || []).filter((m: any) => m.hackathon_id === h.id)
        return {
          id: h.id,
          userId: h.user_id,
          teamName: h.team_name,
          problemStatement: h.problem_statement,
          oldIdea: h.old_idea,
          attendedAt: h.attended_at,
          analysisComplete: h.analysis_complete,
          teamAnalysis: h.team_analysis,
          personalAnalysis: h.personal_analysis,
          createdAt: h.created_at,
          members: hm.map((m: any) => ({
            email: m.email,
            name: m.name,
            testCompleted: m.test_completed,
            skillScores: m.skill_scores,
            userId: m.user_id,
            inviteAccepted: m.invite_accepted,
          })),
        }
      })
      setHackathons(formatted)
    } catch (err) {
      console.error('loadHackathons error:', err)
    }
  }, [profile, setHackathons])

  // Load dismissed IDs
  const loadDismissed = useCallback(async () => {
    if (!profile) return
    try {
      const { data } = await supabase
        .from('hackathon_team_dismissals')
        .select('hackathon_id')
        .eq('user_id', profile.id)
      setDismissedIds(new Set((data || []).map((r: any) => r.hackathon_id)))
    } catch (err) {
      console.error('loadDismissed error:', err)
    }
  }, [profile])

  useEffect(() => {
    loadHackathons()
    loadDismissed()
  }, [loadHackathons, loadDismissed])

  // Pending invite count for badge
  useEffect(() => {
    if (!profile) return
    const loadCount = async () => {
      const { count } = await supabase
        .from('hackathon_invites')
        .select('id', { count: 'exact', head: true })
        .eq('invitee_id', profile.id)
        .eq('status', 'pending')
      setPendingCount(count || 0)
    }
    loadCount()
  }, [profile])

  const { skillProgress } = useAppStore()
  const easyCompleted = skillProgress.filter((s) => s.easyCompleted).length
  const totalSkills = skillProgress.length
  const hackathonReady = easyCompleted >= totalSkills && totalSkills > 0

  const handleAnalyze = async (hack: Hackathon) => {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/analyze-hackathon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hackathon: hack,
          memberProfiles: hack.members.map((m) => ({
            name: m.name || m.email,
            skills: profile?.skills?.map((s: any) => s.n) || [],
            scores: m.skillScores || {},
          })),
        }),
      })
      const data = await res.json()
      const updated = hackathons.map((h) =>
        h.id === hack.id ? { ...h, analysisComplete: true, teamAnalysis: data.teamAnalysis, personalAnalysis: data.personalAnalysis, projectBlueprint: data.projectBlueprint } : h
      )
      setHackathons(updated)
      await supabase.from('hackathons').update({
        analysis_complete: true,
        team_analysis: data.teamAnalysis,
        personal_analysis: data.personalAnalysis,
        project_blueprint: data.projectBlueprint || null,
        team_complementarity: data.teamComplementarity || null,
      }).eq('id', hack.id)
    } catch { console.error('Analysis failed') }
    setAnalyzing(false)
  }

  const handleDismiss = async (hack: Hackathon) => {
    if (!profile) return
    // Anyone deleting the team deletes it for EVERYONE
    const { error } = await supabase.from('hackathons').delete().eq('id', hack.id)
    if (error) { alert('Failed to delete: ' + error.message); return }
    setHackathons(hackathons.filter((h) => h.id !== hack.id))
  }

  // Callback passed to RequestsTab — awaited before switching tab
  const handleAccepted = useCallback(async () => {
    await loadHackathons()
    setPendingCount((c) => Math.max(0, c - 1))
    setActiveTab('my-teams')
  }, [loadHackathons])

  const visibleHacks = hackathons.filter((h) => !dismissedIds.has(h.id))
  const now = new Date()
  const activeHacks = visibleHacks.filter((h) => !h.attendedAt || new Date(h.attendedAt) >= new Date(now.toDateString()))
  const finishedHacks = visibleHacks.filter((h) => h.attendedAt && new Date(h.attendedAt) < new Date(now.toDateString()))
  const bannerHack = activeHacks[0] ?? finishedHacks[0] ?? null
  const gridHacks = visibleHacks.filter((h) => h.id !== bannerHack?.id)

  return (
    <AppShell>
      <TopBar title="Hackathon" subtitle="Track your hackathon journey" />
      <div className="p-6 space-y-6 max-w-4xl">

        {/* Eligibility banner */}
        {!hackathonReady && totalSkills > 0 && (
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,107,129,0.05)', border: '1px solid rgba(255,107,129,0.2)' }}>
            <p className="font-semibold text-sm mb-1" style={{ color: 'var(--err)' }}>🔒 Hackathon Feature Locked</p>
            <p className="text-xs" style={{ color: 'var(--muted2)' }}>
              Clear the easy level in all your skills to unlock hackathons. Progress: {easyCompleted}/{totalSkills} skills.
            </p>
          </div>
        )}

        {hackathonReady && (
          <div className="rounded-2xl p-5 flex items-center justify-between" style={{ background: 'rgba(79,209,197,0.05)', border: '1px solid rgba(79,209,197,0.2)' }}>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--teal)' }}>✓ Hackathon Ready!</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted2)' }}>You've cleared all easy levels. Start your hackathon journey!</p>
            </div>
            <button onClick={() => setShowModal(true)} className="px-5 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0" style={{ background: 'var(--gold)', color: 'var(--ink)' }}>
              + New Hackathon
            </button>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {([
            { key: 'my-teams', label: 'My Hackathon' },
            { key: 'finder', label: 'Find Teams' },
            { key: 'requests', label: 'Requests', badge: pendingCount },
          ] as { key: 'my-teams' | 'requests' | 'finder'; label: string; badge?: number }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: activeTab === tab.key ? 'var(--gold)' : 'transparent', color: activeTab === tab.key ? 'var(--ink)' : 'var(--muted2)' }}
            >
              {tab.label}
              {tab.badge ? (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: activeTab === tab.key ? 'var(--ink)' : 'var(--gold)', color: activeTab === tab.key ? 'var(--gold)' : 'var(--ink)' }}
                >
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* My Hackathon tab */}
        {activeTab === 'my-teams' && (
          <>
            {analyzing && (
              <div className="text-center py-8">
                <div className="spin-ring w-8 h-8 rounded-full mx-auto mb-3" style={{ border: '3px solid var(--border)', borderTopColor: 'var(--gold)' }} />
                <p className="text-sm" style={{ color: 'var(--muted2)' }}>Running AI analysis...</p>
              </div>
            )}

            {bannerHack ? (
              <>
                <MyHackathonBanner hack={bannerHack} currentUserId={profile?.id || ''} onDismiss={handleDismiss} onAnalyze={handleAnalyze} />
                {gridHacks.length > 0 && (
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                      Other Teams
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {gridHacks.map((h) => (
                        <HackCard key={h.id} hack={h} isOwner={h.userId === profile?.id} currentUserId={profile?.id || ''} onAnalyze={handleAnalyze} onDismiss={handleDismiss} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <p className="text-5xl mb-4">⚡</p>
                <p className="font-semibold mb-2" style={{ color: 'var(--text)' }}>No hackathons yet</p>
                <p className="text-sm mb-4" style={{ color: 'var(--muted2)' }}>
                  Create a team or accept an invite — your team will appear here once you accept.
                </p>
                {hackathonReady && (
                  <button onClick={() => setShowModal(true)} className="px-5 py-2 rounded-xl text-sm font-semibold" style={{ background: 'var(--gold)', color: 'var(--ink)' }}>
                    Add Hackathon
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'finder' && profile && (
          <FinderTab profileId={profile.id} />
        )}

        {activeTab === 'requests' && profile && (
          <RequestsTab profileId={profile.id} onAccepted={handleAccepted} />
        )}
      </div>

      {showModal && (
        <NewHackathonModal onClose={() => setShowModal(false)} onAdd={(h) => { addHackathon(h); setHackathons([h, ...hackathons]) }} />
      )}
    </AppShell>
  )
}
