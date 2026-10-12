'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { TopBar } from '@/components/layout/TopBar'
import { useAppStore } from '@/store/appStore'
import { SKILLS_LIST, INTERESTS_LIST, Skill } from '@/types'
import { supabase } from '@/lib/supabase'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <h3 className="text-xs font-semibold mb-4 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{title}</h3>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { profile, setProfile, theme, setTheme, skillProgress, setSkillProgress } = useAppStore()
  const [skills, setSkills] = useState<Skill[]>(profile?.skills || [])
  const [interests, setInterests] = useState<string[]>(profile?.interests || [])
  const [saved, setSaved] = useState(false)
  const [skillSearch, setSkillSearch] = useState('')

  useEffect(() => {
    if (profile) {
      setSkills(profile.skills || [])
      setInterests(profile.interests || [])
    }
  }, [profile])

  const filteredSkills = SKILLS_LIST.filter((s) =>
    s.n.toLowerCase().includes(skillSearch.toLowerCase())
  )

  const grouped = filteredSkills.reduce((acc, s) => {
    if (!acc[s.c]) acc[s.c] = []
    acc[s.c].push(s)
    return acc
  }, {} as Record<string, Skill[]>)

  const toggleSkill = (skill: Skill) => {
    setSkills((prev) =>
      prev.find((s) => s.n === skill.n)
        ? prev.filter((s) => s.n !== skill.n)
        : [...prev, skill]
    )
  }

  const toggleInterest = (i: string) => {
    setInterests((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i])
  }

  const handleSave = async () => {
    const updated = { ...profile!, skills, interests, theme }
    setProfile(updated)
    localStorage.setItem('skillsync_profile', JSON.stringify(updated))
    
    if (profile?.id) {
      try {
        // 1. Update profiles table theme
        await supabase.from('profiles').update({ theme }).eq('id', profile.id)
        
        // 2. Update user_skills — delete all and re-insert
        await supabase.from('user_skills').delete().eq('user_id', profile.id)
        if (skills.length) {
           await supabase.from('user_skills').insert(skills.map(s => ({ user_id: profile.id, skill_name: s.n, category: s.c })))
        }
        
        // 3. Update user_interests — delete all and re-insert
        await supabase.from('user_interests').delete().eq('user_id', profile.id)
        if (interests.length) {
           await supabase.from('user_interests').insert(interests.map(i => ({ user_id: profile.id, interest_name: i })))
        }

        // 4. Sync skill_progress: add new skills, remove old ones
        const currentSkillNames = skills.map(s => s.n)
        
        // 4a. Delete skill_progress for skills that were removed
        const { data: existingProgress } = await supabase.from('skill_progress').select('*').eq('user_id', profile.id)
        const existingSkillNames = (existingProgress || []).map((d: any) => d.skill_name)
        
        const removedSkills = existingSkillNames.filter((name: string) => !currentSkillNames.includes(name))
        if (removedSkills.length > 0) {
          await supabase.from('skill_progress').delete().eq('user_id', profile.id).in('skill_name', removedSkills)
        }
        
        // 4b. Insert skill_progress for newly added skills
        const newEntries = skills
          .filter((s) => !existingSkillNames.includes(s.n))
          .map((s) => ({ user_id: profile.id, skill_name: s.n, easy_completed: false, medium_completed: false, hard_completed: false, weak_concepts: [], tests_attempted: 0 }))
        if (newEntries.length > 0) {
          await supabase.from('skill_progress').insert(newEntries)
        }
        
        // 5. Re-fetch the full skill_progress from DB so store is accurate
        const { data: freshProgress } = await supabase.from('skill_progress').select('*').eq('user_id', profile.id)
        if (freshProgress) {
          const formatted = freshProgress.map((d: any) => ({
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
          }))
          setSkillProgress(formatted)
        } else {
          setSkillProgress([])
        }
      } catch (err) {
        console.error('Settings save DB error:', err)
        // Local save still worked, so we don't block the user
      }
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <AppShell>
      <TopBar title="Settings" subtitle="Customize your SkillSync experience" />
      <div className="p-6 space-y-5 max-w-3xl">
        {/* Theme */}
        <Section title="Theme">
          <div className="flex gap-3">
            {(['dark', 'light'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold capitalize transition-all"
                style={{
                  background: theme === t ? 'var(--gold)' : 'var(--surface)',
                  color: theme === t ? 'var(--ink)' : 'var(--muted2)',
                  border: '1px solid var(--border)',
                }}
              >
                {t === 'dark' ? '🌙' : '☀️'} {t}
              </button>
            ))}
          </div>
        </Section>

        {/* Skills */}
        <Section title={`Skills (${skills.length} selected)`}>
          <input
            type="text"
            placeholder="Search skills..."
            value={skillSearch}
            onChange={(e) => setSkillSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none mb-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--rim)', color: 'var(--text)' }}
          />
          {Object.entries(grouped).map(([category, catSkills]) => (
            <div key={category} className="mb-4">
              <p className="text-[10px] mb-2 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{category}</p>
              <div className="flex flex-wrap gap-2">
                {catSkills.map((s) => {
                  const selected = skills.find((sk) => sk.n === s.n)
                  return (
                    <button
                      key={s.n}
                      onClick={() => toggleSkill(s)}
                      className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                      style={{
                        background: selected ? 'var(--gold-lo)' : 'var(--surface)',
                        color: selected ? 'var(--gold)' : 'var(--muted2)',
                        border: `1px solid ${selected ? 'var(--gold-md)' : 'var(--border)'}`,
                      }}
                    >
                      {selected ? '✓ ' : ''}{s.n}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </Section>

        {/* Interests */}
        <Section title={`Interests (${interests.length} selected)`}>
          <div className="flex flex-wrap gap-2">
            {INTERESTS_LIST.map((interest) => {
              const selected = interests.includes(interest)
              return (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                  style={{
                    background: selected ? 'rgba(79,209,197,0.1)' : 'var(--surface)',
                    color: selected ? 'var(--teal)' : 'var(--muted2)',
                    border: `1px solid ${selected ? 'rgba(79,209,197,0.3)' : 'var(--border)'}`,
                  }}
                >
                  {selected ? '✓ ' : ''}{interest}
                </button>
              )
            })}
          </div>
        </Section>

        {/* Help */}
        <Section title="Help & Support">
          <div className="space-y-3">
            <a href="mailto:support@skillsync.app" className="flex items-center gap-3 py-3 px-4 rounded-xl transition-all hover:opacity-80" style={{ background: 'var(--surface)', color: 'var(--text)' }}>
              <span>📧</span>
              <div>
                <p className="text-sm font-medium">Email Us</p>
                <p className="text-xs" style={{ color: 'var(--muted2)' }}>support@skillsync.app</p>
              </div>
            </a>
            <div className="flex items-center gap-3 py-3 px-4 rounded-xl" style={{ background: 'var(--surface)', color: 'var(--text)' }}>
              <span>📖</span>
              <div>
                <p className="text-sm font-medium">Documentation</p>
                <p className="text-xs" style={{ color: 'var(--muted2)' }}>Guides and tutorials</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-3 px-4 rounded-xl" style={{ background: 'var(--surface)', color: 'var(--text)' }}>
              <span>💬</span>
              <div>
                <p className="text-sm font-medium">Community Discord</p>
                <p className="text-xs" style={{ color: 'var(--muted2)' }}>Join fellow developers</p>
              </div>
            </div>
          </div>
        </Section>

        <button
          onClick={handleSave}
          className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all"
          style={{ background: saved ? 'var(--teal)' : 'var(--gold)', color: 'var(--ink)' }}
        >
          {saved ? '✓ Settings Saved!' : 'Save Settings'}
        </button>
      </div>
    </AppShell>
  )
}
