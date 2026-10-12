'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { TopBar } from '@/components/layout/TopBar'
import { useAppStore } from '@/store/appStore'
import { SKILLS_LIST } from '@/types'
import { supabase } from '@/lib/supabase'


export default function ProfilePage() {
  const { profile, setProfile } = useAppStore()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    username: '',
    email: '',
    phone: '',
    bio: '',
    role: 'student' as 'student' | 'professional',
    year_of_study: '',
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        username: profile.username || '',
        email: profile.email || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        role: profile.role || 'student',
        year_of_study: profile.year_of_study || '',
      })
    }
  }, [profile])

  const handleSave = async () => {
    const updated = { ...profile!, ...form }
    setProfile(updated)
    localStorage.setItem('skillsync_profile', JSON.stringify(updated))
    if (profile?.id) {
      await supabase.from('profiles').update(form).eq('id', profile.id)
    }
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const inp = (label: string, key: keyof typeof form, type = 'text') => (
    <div>
      <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{label}</label>
      <input
        type={type}
        value={form[key] as string}
        disabled={!editing}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
        style={{
          background: editing ? 'var(--surface)' : 'transparent',
          border: `1px solid ${editing ? 'var(--rim)' : 'var(--border)'}`,
          color: 'var(--text)',
        }}
      />
    </div>
  )

  const skillsCount = profile?.skills?.length || 0
  const { skillProgress, setSkillProgress } = useAppStore()
  
  useEffect(() => {
    if (!profile) return
    const loadProgress = async () => {
      try {
        // Always re-fetch from DB to pick up changes from settings
        const { data, error } = await supabase.from('skill_progress').select('*').eq('user_id', profile.id)
        if (error) {
          console.error('Profile page: Failed to load skill progress:', error)
          return
        }
        if (data) {
          // Filter to only include skills that are currently in the user's profile
          const currentSkillNames = (profile.skills || []).map(s => s.n)
          const filtered = data.filter((d: any) => currentSkillNames.includes(d.skill_name))
          
          const formatted = filtered.map((d: any) => ({
            skill: d.skill_name,
            easyCompleted: d.easy_completed,
            mediumCompleted: d.medium_completed,
            hardCompleted: d.hard_completed,
            easyScore: d.easy_score,
            mediumScore: d.medium_score,
            hardScore: d.hard_score,
            testsAttempted: d.tests_attempted,
            weakConcepts: d.weak_concepts || [],
          }))
          setSkillProgress(formatted)
        }
      } catch (err) {
        console.error('Profile page loadProgress error:', err)
      }
    }
    loadProgress()
  }, [profile, setSkillProgress])

  const testsTotal = skillProgress.reduce((a, b) => a + b.testsAttempted, 0)
  const completedSkills = skillProgress.filter((s) => s.easyCompleted).length

  return (
    <AppShell>
      <TopBar title="Profile" subtitle="Your identity on SkillSync" />
      <div className="p-6 max-w-3xl space-y-6">
        {profile?.username && (
          <a
            href={`/badge/${encodeURIComponent(profile.username)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ background: 'var(--gold-lo)', border: '1px solid var(--gold-md)', color: 'var(--gold)' }}
          >
            🏅 View & share my public skill badge
          </a>
        )}
        {/* Profile card */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex items-start gap-5 mb-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold"
                style={{ background: 'var(--gold-lo)', border: '2px solid var(--gold-hi)', color: 'var(--gold)', fontFamily: 'var(--font-playfair)' }}
              >
                {profile?.full_name?.[0]?.toUpperCase() || '?'}
              </div>
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--text)' }}>
                {profile?.full_name || 'Your Name'}
              </h2>
              <p className="text-sm" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted2)' }}>@{profile?.username || 'username'}</p>
              <p className="text-xs mt-1 capitalize px-2 py-0.5 rounded-full inline-block" style={{ background: 'var(--gold-lo)', color: 'var(--gold)', border: '1px solid var(--gold-md)' }}>
                {profile?.role || 'student'}
              </p>
            </div>

            <button
              onClick={() => editing ? handleSave() : setEditing(true)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: editing ? 'var(--gold)' : 'var(--surface)', color: editing ? 'var(--ink)' : 'var(--text)', border: '1px solid var(--border)' }}
            >
              {editing ? (saved ? '✓ Saved' : 'Save') : 'Edit'}
            </button>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 rounded-xl" style={{ background: 'var(--surface)' }}>
            {[
              { label: 'Skills', value: skillsCount },
              { label: 'Tests Done', value: testsTotal },
              { label: 'Skills Cleared', value: completedSkills },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--font-playfair)' }}>{value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted2)' }}>{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {inp('Full Name', 'full_name')}
            {inp('Username', 'username')}
            {inp('Email', 'email', 'email')}
            {inp('Phone', 'phone', 'tel')}
          </div>

          <div className="mt-4">
            <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>Bio</label>
            <textarea
              value={form.bio}
              disabled={!editing}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none transition-all"
              style={{
                background: editing ? 'var(--surface)' : 'transparent',
                border: `1px solid ${editing ? 'var(--rim)' : 'var(--border)'}`,
                color: 'var(--text)',
              }}
            />
          </div>

          {/* Role selector */}
          {editing && (
            <div className="mt-4">
              <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>Role</label>
              <div className="flex gap-3">
                {(['student', 'professional'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setForm((f) => ({ ...f, role: r }))}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize"
                    style={{
                      background: form.role === r ? 'var(--gold)' : 'var(--surface)',
                      color: form.role === r ? 'var(--ink)' : 'var(--muted2)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {form.role === 'student' && (
                <input
                  type="text"
                  placeholder="Year of study (e.g. 3rd year CSE)"
                  value={form.year_of_study}
                  onChange={(e) => setForm((f) => ({ ...f, year_of_study: e.target.value }))}
                  className="w-full mt-3 px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--rim)', color: 'var(--text)' }}
                />
              )}
            </div>
          )}
        </div>

        {/* Skills summary */}
        {profile?.skills && profile.skills.length > 0 && (
          <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>My Skills</h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <span key={s.n} className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ background: 'var(--gold-lo)', color: 'var(--gold)', border: '1px solid var(--gold-md)' }}>
                  {s.n}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
