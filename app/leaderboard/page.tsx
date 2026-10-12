'use client'

import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { TopBar } from '@/components/layout/TopBar'
import { useAppStore } from '@/store/appStore'
import { supabase } from '@/lib/supabase'
import { LeaderboardEntry, SKILLS_LIST } from '@/types'

const LEVEL_COLORS: Record<string, string> = { easy: '#4fd1c5', medium: '#e8c97a', hard: '#ff6b81', none: '#8a8a95' }
const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const { profile } = useAppStore()
  const [skillFilter, setSkillFilter] = useState<string>('')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      const { data, error: rpcError } = await supabase.rpc('get_leaderboard', {
        p_skill: skillFilter || null,
        p_limit: 50,
      })
      if (cancelled) return
      if (rpcError) {
        console.error('Leaderboard load failed:', rpcError)
        setError('Could not load the leaderboard. Make sure sql1.sql has been run on your Supabase project.')
        setEntries([])
      } else {
        const formatted: LeaderboardEntry[] = (data || []).map((d: any) => ({
          username: d.username,
          fullName: d.full_name,
          avatarUrl: d.avatar_url,
          skill: d.skill_name,
          bestLevel: d.best_level,
          bestScore: Number(d.best_score) || 0,
          testsAttempted: d.tests_attempted,
        }))
        setEntries(formatted)
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [skillFilter])

  return (
    <AppShell>
      <TopBar title="Leaderboard" subtitle="See how your verified skills stack up" />
      <div className="p-6 space-y-6 max-w-4xl">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSkillFilter('')}
            className="px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: skillFilter === '' ? 'var(--gold)' : 'var(--surface)',
              color: skillFilter === '' ? 'var(--ink)' : 'var(--muted2)',
              border: '1px solid var(--border)',
            }}
          >
            All Skills
          </button>
          {(profile?.skills?.length ? profile.skills.map((s) => s.n) : SKILLS_LIST.map((s) => s.n)).map((name) => (
            <button
              key={name}
              onClick={() => setSkillFilter(name)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: skillFilter === name ? 'var(--gold)' : 'var(--surface)',
                color: skillFilter === name ? 'var(--ink)' : 'var(--muted2)',
                border: '1px solid var(--border)',
              }}
            >
              {name}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-2xl p-4 text-sm" style={{ background: 'rgba(255,107,129,0.05)', border: '1px solid rgba(255,107,129,0.2)', color: 'var(--err)' }}>
            {error}
          </div>
        )}

        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {loading ? (
            <div className="p-10 text-center">
              <div className="spin-ring w-8 h-8 rounded-full mx-auto mb-3" style={{ border: '2px solid var(--border)', borderTopColor: 'var(--gold)' }} />
              <p className="text-xs" style={{ color: 'var(--muted2)' }}>Loading rankings…</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-3xl mb-3">🏁</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>No results yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted2)' }}>Be the first to verify this skill and top the board.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: 'var(--muted)' }}>#</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: 'var(--muted)' }}>Name</th>
                  {!skillFilter && <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: 'var(--muted)' }}>Skill</th>}
                  <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: 'var(--muted)' }}>Level</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold" style={{ color: 'var(--muted)' }}>Score</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold" style={{ color: 'var(--muted)' }}>Attempts</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr
                    key={`${e.username}-${e.skill}`}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: e.username === profile?.username ? 'var(--gold-lo)' : 'transparent',
                    }}
                  >
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: 'var(--muted2)' }}>{MEDALS[i] || i + 1}</td>
                    <td className="px-5 py-3">
                      <span className="font-semibold" style={{ color: 'var(--text)' }}>{e.fullName}</span>
                      <span className="ml-2 text-xs" style={{ color: 'var(--muted2)', fontFamily: 'var(--font-mono)' }}>@{e.username}</span>
                    </td>
                    {!skillFilter && <td className="px-5 py-3 text-xs" style={{ color: 'var(--muted2)' }}>{e.skill}</td>}
                    <td className="px-5 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full capitalize font-semibold"
                        style={{ background: `${LEVEL_COLORS[e.bestLevel]}20`, color: LEVEL_COLORS[e.bestLevel] }}
                      >
                        {e.bestLevel}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-bold" style={{ color: 'var(--gold)' }}>{Math.round(e.bestScore * 100)}%</td>
                    <td className="px-5 py-3 text-right text-xs" style={{ color: 'var(--muted2)' }}>{e.testsAttempted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  )
}
