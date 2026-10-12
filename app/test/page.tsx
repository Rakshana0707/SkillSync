'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { TopBar } from '@/components/layout/TopBar'
import { useAppStore } from '@/store/appStore'
import { SkillProgress, QuestionLevel, RETEST_COOLDOWN_MINUTES, BADGE_VALIDITY_DAYS } from '@/types'
import { supabase } from '@/lib/supabase'

const LEVEL_ORDER: QuestionLevel[] = ['easy', 'medium', 'hard']
const LEVEL_COLORS = { easy: '#4fd1c5', medium: '#e8c97a', hard: '#ff6b81' }
const LEVEL_TIMES = { easy: '15 min', medium: '25 min', hard: '40 min' }

function isBadgeExpired(verifiedAt?: string) {
  if (!verifiedAt) return false
  return Date.now() - new Date(verifiedAt).getTime() > BADGE_VALIDITY_DAYS * 24 * 60 * 60 * 1000
}

function cooldownRemainingMs(lastAttempt?: string) {
  if (!lastAttempt) return 0
  const elapsed = Date.now() - new Date(lastAttempt).getTime()
  const remaining = RETEST_COOLDOWN_MINUTES * 60 * 1000 - elapsed
  return remaining > 0 ? remaining : 0
}

function SkillTestCard({ progress, onStart }: { progress: SkillProgress; onStart: (skill: string, level: QuestionLevel) => void }) {
  const nextLevel = LEVEL_ORDER.find((l) => !progress[`${l}Completed` as keyof SkillProgress])
  const allDone = LEVEL_ORDER.every((l) => progress[`${l}Completed` as keyof SkillProgress])
  const cooldownMs = cooldownRemainingMs(progress.lastAttempt)
  const cooldownMins = Math.ceil(cooldownMs / 60000)

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-base" style={{ color: 'var(--text)' }}>{progress.skill}</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted2)', fontFamily: 'var(--font-mono)' }}>
            {progress.testsAttempted} attempts
          </p>
        </div>
        {allDone && (
          <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: 'rgba(79,209,197,0.1)', color: 'var(--teal)', border: '1px solid rgba(79,209,197,0.2)' }}>
            MASTERED ✓
          </span>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        {LEVEL_ORDER.map((lvl, i) => {
          const done = progress[`${lvl}Completed` as keyof SkillProgress] as boolean
          const score = progress[`${lvl}Score` as keyof SkillProgress] as number | undefined
          const verifiedAt = progress[`${lvl}VerifiedAt` as keyof SkillProgress] as string | undefined
          const expired = done && isBadgeExpired(verifiedAt)
          const locked = i > 0 && !(progress[`${LEVEL_ORDER[i - 1]}Completed` as keyof SkillProgress] as boolean)
          const isCurrent = lvl === nextLevel
          const onCooldown = !done && cooldownMs > 0 && lvl === nextLevel
          const clickable = !locked && (!done || expired) && !onCooldown

          return (
            <button
              key={lvl}
              disabled={!clickable}
              onClick={() => clickable && onStart(progress.skill, lvl)}
              title={onCooldown ? `Wait ${cooldownMins} more min before retrying` : expired ? 'Badge expired — click to re-verify' : undefined}
              className="flex-1 py-3 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: expired ? 'rgba(255,107,129,0.08)' : done ? `${LEVEL_COLORS[lvl]}15` : isCurrent ? `${LEVEL_COLORS[lvl]}25` : 'var(--surface)',
                color: expired ? 'var(--err)' : done ? LEVEL_COLORS[lvl] : isCurrent ? LEVEL_COLORS[lvl] : 'var(--muted)',
                border: `1px solid ${expired ? 'rgba(255,107,129,0.4)' : done || isCurrent ? LEVEL_COLORS[lvl] + '50' : 'var(--border)'}`,
                opacity: locked || onCooldown ? 0.4 : 1,
                cursor: clickable ? 'pointer' : 'default',
              }}
            >
              <div className="text-lg mb-1">{expired ? '↻' : done ? '✓' : locked ? '🔒' : onCooldown ? '⏳' : isCurrent ? '▶' : '○'}</div>
              <div className="capitalize">{lvl}</div>
              {score !== undefined && <div className="text-[10px] mt-0.5">{Math.round(score * 100)}%</div>}
              {expired && <div className="text-[10px] mt-0.5">Re-verify</div>}
              {onCooldown && <div className="text-[10px] mt-0.5">{cooldownMins}m left</div>}
              {!done && !locked && !onCooldown && <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>{LEVEL_TIMES[lvl]}</div>}
            </button>
          )
        })}
      </div>

      {nextLevel && !allDone && (
        cooldownMs > 0 ? (
          <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center" style={{ background: 'var(--surface)', color: 'var(--muted2)', border: '1px solid var(--border)' }}>
            ⏳ Retry available in {cooldownMins} min
          </div>
        ) : (
          <button
            onClick={() => onStart(progress.skill, nextLevel)}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: LEVEL_COLORS[nextLevel], color: 'var(--ink)' }}
          >
            Start {nextLevel.charAt(0).toUpperCase() + nextLevel.slice(1)} Test →
          </button>
        )
      )}

      {progress.weakConcepts.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-[10px] mb-1.5" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>STUDY THESE:</p>
          <div className="flex flex-wrap gap-1">
            {progress.weakConcepts.map((c) => (
              <span key={c} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,107,129,0.1)', color: 'var(--err)' }}>{c}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function TestPage() {
  const router = useRouter()
  const { profile, skillProgress, setSkillProgress } = useAppStore()

  useEffect(() => {
    if (!profile) return
    const loadProgress = async () => {
      try {
        // Always re-fetch from DB to pick up changes from settings
        const { data, error } = await supabase.from('skill_progress').select('*').eq('user_id', profile.id)
        
        if (error) {
          console.error('Test page: Failed to load skill progress:', error)
          if (profile.skills && profile.skills.length > 0) {
            const fallback: SkillProgress[] = profile.skills.map((s) => ({
              skill: s.n,
              easyCompleted: false,
              mediumCompleted: false,
              hardCompleted: false,
              weakConcepts: [],
              testsAttempted: 0,
            }))
            setSkillProgress(fallback)
          } else {
            setSkillProgress([])
          }
          return
        }
        
        if (data && data.length > 0) {
          // Filter to only include skills that are currently in the user's profile
          const currentSkillNames = (profile.skills || []).map(s => s.n)
          const filtered = data.filter((d: any) => currentSkillNames.includes(d.skill_name))
          
          const formatted: SkillProgress[] = filtered.map((d: any) => ({
            skill: d.skill_name,
            easyCompleted: d.easy_completed,
            mediumCompleted: d.medium_completed,
            hardCompleted: d.hard_completed,
            easyScore: d.easy_score,
            mediumScore: d.medium_score,
            hardScore: d.hard_score,
            weakConcepts: d.weak_concepts || [],
            testsAttempted: d.tests_attempted,
            lastAttempt: d.last_attempt,
            easyVerifiedAt: d.easy_verified_at,
            mediumVerifiedAt: d.medium_verified_at,
            hardVerifiedAt: d.hard_verified_at,
          }))
          setSkillProgress(formatted)
        } else if (profile?.skills && profile.skills.length > 0) {
          // Initialize from profile skills into DB
          const initial = profile.skills.map((s) => ({
            user_id: profile.id,
            skill_name: s.n,
            easy_completed: false,
            medium_completed: false,
            hard_completed: false,
            weak_concepts: [],
            tests_attempted: 0,
          }))
          const { error: insErr } = await supabase.from('skill_progress').insert(initial)
          if (insErr) console.error(insErr)
          
          const formatted: SkillProgress[] = initial.map((d) => ({
            skill: d.skill_name,
            easyCompleted: d.easy_completed,
            mediumCompleted: d.medium_completed,
            hardCompleted: d.hard_completed,
            weakConcepts: d.weak_concepts || [],
            testsAttempted: d.tests_attempted,
          }))
          setSkillProgress(formatted)
        } else {
          setSkillProgress([])
        }
      } catch (err) {
        console.error('Test page loadProgress error:', err)
        if (profile.skills && profile.skills.length > 0) {
          const fallback: SkillProgress[] = profile.skills.map((s) => ({
            skill: s.n,
            easyCompleted: false,
            mediumCompleted: false,
            hardCompleted: false,
            weakConcepts: [],
            testsAttempted: 0,
          }))
          setSkillProgress(fallback)
        } else {
          setSkillProgress([])
        }
      }
    }
    loadProgress()
  }, [profile, setSkillProgress])

  const handleStart = (skill: string, level: QuestionLevel) => {
    router.push(`/test/session?skill=${encodeURIComponent(skill)}&level=${level}`)
  }

  return (
    <AppShell>
      <TopBar title="Take Test" subtitle="Prove your skills level by level" />
      <div className="p-6 space-y-6 max-w-5xl">
        {/* Info banner */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(232,201,122,0.05)', border: '1px solid var(--gold-md)' }}>
          <h2 className="font-bold mb-2" style={{ color: 'var(--gold)', fontFamily: 'var(--font-playfair)' }}>Test Rules</h2>
          <ul className="text-sm space-y-1" style={{ color: 'var(--muted2)' }}>
            <li>• Complete easy → medium → hard (sequential unlock)</li>
            <li>• Score ≥ 60% to pass and unlock the next level</li>
            <li>• Camera must be ON — 3 movement warnings auto-submit</li>
            <li>• Tab switching = auto-submit immediately</li>
            <li>• 10 questions per test with time limits</li>
          </ul>
        </div>

        {skillProgress.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {skillProgress.map((sp) => (
              <SkillTestCard key={sp.skill} progress={sp} onStart={handleStart} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <p className="text-4xl mb-4">📚</p>
            <p className="font-semibold mb-2" style={{ color: 'var(--text)' }}>No skills to test</p>
            <p className="text-sm mb-4" style={{ color: 'var(--muted2)' }}>Add skills from Settings to start taking tests</p>
            <button onClick={() => router.push('/settings')} className="px-5 py-2 rounded-xl text-sm font-semibold" style={{ background: 'var(--gold)', color: 'var(--ink)' }}>
              Add Skills
            </button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
