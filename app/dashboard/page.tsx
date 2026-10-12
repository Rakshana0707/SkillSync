'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { TopBar } from '@/components/layout/TopBar'
import { useAppStore } from '@/store/appStore'
import { SkillProgress, BADGE_VALIDITY_DAYS } from '@/types'
import { supabase } from '@/lib/supabase'

function isBadgeExpired(verifiedAt?: string) {
  if (!verifiedAt) return false
  return Date.now() - new Date(verifiedAt).getTime() > BADGE_VALIDITY_DAYS * 24 * 60 * 60 * 1000
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-2" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <p className="text-xs tracking-widest uppercase" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{label}</p>
      <p className="text-3xl font-bold" style={{ color: color || 'var(--gold)', fontFamily: 'var(--font-playfair)' }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: 'var(--muted2)' }}>{sub}</p>}
    </div>
  )
}

function SkillCard({ progress, onViewRoadmap }: { progress: SkillProgress; onViewRoadmap: (skill: string, weakConcepts: string[]) => void }) {
  const levels = ['easy', 'medium', 'hard'] as const
  const levelColors = { easy: '#4fd1c5', medium: '#e8c97a', hard: '#ff6b81' }

  return (
    <div className="rounded-2xl p-5 flex flex-col justify-between" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{progress.skill}</h3>
          <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--surface)', color: 'var(--muted2)', fontFamily: 'var(--font-mono)' }}>
            {progress.testsAttempted} tests
          </span>
        </div>
        <div className="flex gap-2 mb-3">
          {levels.map((lvl) => {
            const done = progress[`${lvl}Completed` as keyof SkillProgress] as boolean
            const score = progress[`${lvl}Score` as keyof SkillProgress] as number | undefined
            const verifiedAt = progress[`${lvl}VerifiedAt` as keyof SkillProgress] as string | undefined
            const expired = done && isBadgeExpired(verifiedAt)
            return (
              <div key={lvl} className="flex-1 text-center">
                <div
                  className="rounded-lg py-2 text-xs font-semibold mb-1"
                  style={{
                    background: expired ? 'rgba(255,107,129,0.1)' : done ? `${levelColors[lvl]}20` : 'var(--surface)',
                    color: expired ? 'var(--err)' : done ? levelColors[lvl] : 'var(--muted)',
                    border: `1px solid ${expired ? 'rgba(255,107,129,0.4)' : done ? levelColors[lvl] + '40' : 'var(--border)'}`,
                  }}
                >
                  {expired ? '↻' : done ? '✓' : '○'}
                </div>
                <p className="text-[10px] capitalize" style={{ color: 'var(--muted2)' }}>{lvl}</p>
                {score !== undefined && (
                  <p className="text-[10px] font-bold" style={{ color: expired ? 'var(--err)' : levelColors[lvl] }}>
                    {expired ? 'Re-verify' : `${Math.round(score * 100)}%`}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
      {progress.weakConcepts.length > 0 && (
        <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[10px] mb-1.5" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>FOCUS ON:</p>
          <div className="flex flex-wrap gap-1 mb-3">
            {progress.weakConcepts.slice(0, 3).map((c) => (
              <span key={c} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,107,129,0.1)', color: 'var(--err)', border: '1px solid rgba(255,107,129,0.2)' }}>{c}</span>
            ))}
          </div>
          <button
            onClick={() => onViewRoadmap(progress.skill, progress.weakConcepts)}
            className="w-full py-2 rounded-xl text-[10px] font-bold tracking-[0.5px] uppercase transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, rgba(232,201,122,0.15) 0%, rgba(232,201,122,0.05) 100%)',
              border: '1px solid var(--gold-md)',
              color: 'var(--gold)'
            }}
          >
            Generate Roadmap ⚡
          </button>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { profile, skillProgress, setSkillProgress } = useAppStore()
  const [loaded, setLoaded] = useState(false)
  const [activeRoadmap, setActiveRoadmap] = useState<{ skill: string; steps: any[] } | null>(null)
  const [loadingRoadmap, setLoadingRoadmap] = useState(false)
  const [roadmapError, setRoadmapError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) {
      setLoaded(true)
      return
    }
    const loadProgress = async () => {
      try {
        // Always re-fetch from DB to pick up changes from settings
        const { data, error } = await supabase.from('skill_progress').select('*').eq('user_id', profile.id)
        
        if (error) {
          console.error('Failed to load skill progress:', error)
          // Fall back to initializing from profile skills locally
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
          try {
            await supabase.from('skill_progress').insert(initial)
          } catch (error) {
            console.error(error)
          }
          
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
        console.error('Dashboard loadProgress error:', err)
        // Fallback: initialize from profile skills locally
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
      } finally {
        setLoaded(true)
      }
    }
    loadProgress()
  }, [profile, setSkillProgress])

  const totalTests = skillProgress.reduce((a, b) => a + b.testsAttempted, 0)
  const completedEasy = skillProgress.filter((s) => s.easyCompleted).length
  const hackathonReady = completedEasy >= skillProgress.length && skillProgress.length > 0

  const nextTest = skillProgress.find((s) => !s.easyCompleted) ||
    skillProgress.find((s) => s.easyCompleted && !s.mediumCompleted)

  const expiredSkills = skillProgress.filter((s) =>
    (s.easyCompleted && isBadgeExpired(s.easyVerifiedAt)) ||
    (s.mediumCompleted && isBadgeExpired(s.mediumVerifiedAt)) ||
    (s.hardCompleted && isBadgeExpired(s.hardVerifiedAt))
  )

  const handleViewRoadmap = async (skill: string, weakConcepts: string[]) => {
    setLoadingRoadmap(true)
    setRoadmapError(null)
    try {
      const res = await fetch('/api/generate-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill, weakConcepts })
      })
      if (!res.ok) {
        throw new Error('Failed to generate roadmap')
      }
      const data = await res.json()
      setActiveRoadmap({ skill, steps: data.roadmap })
    } catch (err: any) {
      console.error(err)
      setRoadmapError('Failed to generate roadmap. Please try again.')
    } finally {
      setLoadingRoadmap(false)
    }
  }

  if (!loaded) return null

  return (
    <AppShell>
      <TopBar title="Dashboard" subtitle="Your skill journey at a glance" />
      <div className="p-6 space-y-6 max-w-6xl">
        {/* Welcome */}
        <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--card) 0%, rgba(232,201,122,0.05) 100%)', border: '1px solid var(--gold-md)' }}>
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full -translate-y-1/2 translate-x-1/2" style={{ background: 'radial-gradient(circle, rgba(232,201,122,0.08) 0%, transparent 70%)' }} />
          <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--gold)' }}>
            Welcome back, {profile?.full_name?.split(' ')[0] || 'Warrior'} ⚡
          </h2>
          <p className="text-sm" style={{ color: 'var(--muted2)' }}>
            {hackathonReady
              ? '🎉 You are hackathon-ready! Go crush it.'
              : `Complete easy levels in all skills to unlock hackathons. ${completedEasy}/${skillProgress.length} done.`}
          </p>
          {nextTest && (
            <button
              onClick={() => router.push('/test')}
              className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--gold)', color: 'var(--ink)' }}
            >
              Continue: {nextTest.skill} →
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Tests Taken" value={totalTests} sub="total attempts" />
          <StatCard label="Skills Added" value={skillProgress.length} sub="in profile" color="var(--teal)" />
          <StatCard label="Easy Cleared" value={completedEasy} sub={`of ${skillProgress.length}`} color="#a78bfa" />
          <StatCard label="Hackathon" value={hackathonReady ? 'Ready ✓' : 'Locked'} sub={hackathonReady ? 'Access granted' : 'Complete easy tests'} color={hackathonReady ? '#4fd1c5' : 'var(--muted)'} />
        </div>

        {expiredSkills.length > 0 && (
          <div
            className="rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3"
            style={{ background: 'rgba(255,107,129,0.05)', border: '1px solid rgba(255,107,129,0.2)' }}
          >
            <p className="text-sm" style={{ color: 'var(--err)' }}>
              ↻ {expiredSkills.length} badge{expiredSkills.length > 1 ? 's' : ''} older than {BADGE_VALIDITY_DAYS} days — re-verify to keep your profile current: {expiredSkills.map((s) => s.skill).join(', ')}
            </p>
            <button
              onClick={() => router.push('/test')}
              className="px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ background: 'var(--err)', color: 'var(--ink)' }}
            >
              Re-verify now
            </button>
          </div>
        )}

        {/* Skill progress */}
        {skillProgress.length > 0 ? (
          <div>
            <h2 className="text-sm font-semibold mb-4 tracking-widest uppercase" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>Skill Progress</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {skillProgress.map((sp) => (
                <SkillCard key={sp.skill} progress={sp} onViewRoadmap={handleViewRoadmap} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <p className="text-4xl mb-4">🎯</p>
            <p className="font-semibold mb-2" style={{ color: 'var(--text)' }}>No skills added yet</p>
            <p className="text-sm mb-4" style={{ color: 'var(--muted2)' }}>Add skills from your Settings to start testing</p>
            <button onClick={() => router.push('/settings')} className="px-5 py-2 rounded-xl text-sm font-semibold" style={{ background: 'var(--gold)', color: 'var(--ink)' }}>
              Update Skills
            </button>
          </div>
        )}

        {/* Loading Roadmap Modal */}
        {loadingRoadmap && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-center p-8 rounded-3xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="spin-ring w-12 h-12 rounded-full mx-auto mb-4" style={{ border: '3px solid var(--border)', borderTopColor: 'var(--gold)' }} />
              <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text)', fontFamily: 'var(--font-playfair)' }}>Generating Learning Roadmap</h3>
              <p className="text-xs animate-pulse" style={{ color: 'var(--muted2)' }}>Analyzing weak concepts and fetching documentation links...</p>
            </div>
          </div>
        )}

        {/* Roadmap Display Modal */}
        {activeRoadmap && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={() => setActiveRoadmap(null)}>
            <div 
              className="w-full max-w-2xl rounded-3xl p-6 relative animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto" 
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => setActiveRoadmap(null)}
                className="absolute top-4 right-4 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 transition-all"
                style={{ color: 'var(--muted2)' }}
              >
                ×
              </button>

              {/* Title */}
              <div className="mb-6">
                <span className="text-[10px] tracking-[2px] uppercase font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold)' }}>Custom Study Plan</span>
                <h3 className="text-2xl font-bold mt-1" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--text)' }}>
                  {activeRoadmap.skill} Study Guide ⚡
                </h3>
              </div>

              {/* Steps timeline */}
              <div className="space-y-6 relative">
                {/* Custom styling fallback for the vertical timeline line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-[2px]" style={{ background: 'var(--border)' }} />

                {activeRoadmap.steps.map((step: any, idx: number) => (
                  <div key={idx} className="relative pl-10">
                    {/* Circle marker */}
                    <div 
                      className="absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border shadow-[0_0_15px_rgba(232,201,122,0.1)]"
                      style={{ 
                        background: 'var(--card)', 
                        borderColor: 'var(--gold-md)', 
                        color: 'var(--gold)',
                        fontFamily: 'var(--font-mono)'
                      }}
                    >
                      {idx + 1}
                    </div>

                    {/* Step Card */}
                    <div className="rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <h4 className="font-bold text-sm mb-2" style={{ color: 'var(--text)' }}>{step.concept}</h4>
                      <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--muted2)' }}>{step.explanation}</p>
                      
                      {/* Resources */}
                      {step.resources && step.resources.length > 0 && (
                        <div className="mb-3">
                          <p className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>Recommended Resources:</p>
                          <div className="flex flex-wrap gap-2">
                            {step.resources.map((res: any, rIdx: number) => (
                              <a 
                                key={rIdx} 
                                href={res.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[10px] px-3 py-1 rounded-lg border font-semibold flex items-center gap-1 transition-all duration-200"
                                style={{ 
                                  borderColor: 'rgba(79,209,197,0.2)', 
                                  color: 'var(--teal)',
                                  background: 'rgba(79,209,197,0.05)'
                                }}
                              >
                                🔗 {res.title}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Practice Task */}
                      {step.practiceTask && (
                        <div className="p-3 rounded-xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                          <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>Practice Task:</p>
                          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text)' }}>{step.practiceTask}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Close Button Bottom */}
              <button 
                onClick={() => setActiveRoadmap(null)}
                className="mt-6 w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{ background: 'var(--gold)', color: 'var(--ink)' }}
              >
                Close Plan
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
