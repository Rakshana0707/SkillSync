'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { supabase, hashPassword, generateUserId } from '@/lib/supabase'
import { SkillTagger } from './SkillTagger'
import { InterestTagger } from './InterestTagger'

const AlertIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

export function SignupStep2() {
  const {
    step1Data, role, setRole, yearOfStudy, setYearOfStudy,
    skills, addSkill, removeSkill, interests, addInterest, removeInterest,
    termsAccepted, setTermsAccepted, setStep, setSuccess,
  } = useAuthStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignup = async () => {
    if (!skills.length) { setError('Add at least one skill to continue.'); return }
    if (!termsAccepted) { setError('Accept the Terms of Service to continue.'); return }

    setLoading(true); setError(null)

    try {
      // Generate a UUID for this user (no Supabase Auth needed)
      const uid = generateUserId()

      // Hash the password for storage
      const pwHash = await hashPassword(step1Data.password)

      // Insert profile directly into the database
      const { error: profileError } = await supabase.from('profiles').insert({
        id: uid,
        full_name: step1Data.fullName,
        username: step1Data.username,
        email: step1Data.email,
        phone: step1Data.phone,
        password_hash: pwHash,
        role,
        year_of_study: yearOfStudy,
      })

      if (profileError) {
        // Check for unique constraint violations
        if (profileError.message.includes('duplicate') || profileError.code === '23505') {
          if (profileError.message.includes('username')) {
            setError('This username is already taken. Please choose another.')
          } else if (profileError.message.includes('email')) {
            setError('An account with this email already exists. Try logging in.')
          } else {
            setError(`Profile creation failed: ${profileError.message}`)
          }
        } else {
          setError(`Profile creation failed: ${profileError.message}`)
        }
        setLoading(false)
        return
      }

      // Insert skills
      if (skills.length) {
        const { error: skillsError } = await supabase.from('user_skills').insert(
          skills.map((s) => ({ user_id: uid, skill_name: s.n, category: s.c }))
        )
        if (skillsError) {
          console.warn('Skills insert warning:', skillsError.message)
        }
      }

      // Insert interests
      if (interests.length) {
        const { error: interestsError } = await supabase.from('user_interests').insert(
          interests.map((i) => ({ user_id: uid, interest_name: i }))
        )
        if (interestsError) {
          console.warn('Interests insert warning:', interestsError.message)
        }
      }

      // Save profile to localStorage for immediate use
      const profileData = {
        id: uid,
        full_name: step1Data.fullName,
        username: step1Data.username,
        email: step1Data.email,
        phone: step1Data.phone,
        role,
        year_of_study: yearOfStudy,
        skills,
        interests,
        theme: 'dark',
        created_at: new Date().toISOString(),
      }
      localStorage.setItem('skillsync_profile', JSON.stringify(profileData))
      
      // Initialize skill progress in Supabase
      if (skills.length) {
        const initialProgressDb = skills.map((s) => ({
          user_id: uid,
          skill_name: s.n,
          easy_completed: false,
          medium_completed: false,
          hard_completed: false,
          weak_concepts: [],
          tests_attempted: 0,
        }))
        const { error: spError } = await supabase.from('skill_progress').insert(initialProgressDb)
        if (spError) console.warn('Skill progress insert warning:', spError.message)
      }
      
      setLoading(false)
      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during signup.')
      setLoading(false)
    }
  }

  return (
    <div className="pane-in">
      <div className="font-bold leading-[1.05] tracking-[-0.5px] mb-[5px] text-[32px]"
        style={{ fontFamily: 'var(--font-playfair), Georgia, serif', color: 'var(--text)' }}>
        Your <em className="italic" style={{ color: 'var(--gold)' }}>profile.</em>
      </div>
      <div className="text-[12px] font-light tracking-[0.2px] mb-[26px]" style={{ color: 'var(--muted2)' }}>
        Step 2 of 2 — Skills &amp; background.
      </div>

      {error && (
        <div className="slide-down flex items-center gap-2 px-[13px] py-[10px] rounded-[7px] text-[12px] mb-[14px]"
          style={{ background: 'rgba(255,107,129,0.08)', border: '1px solid rgba(255,107,129,0.2)', color: 'var(--err)' }}>
          <AlertIcon /> {error}
        </div>
      )}

      {/* Role */}
      <div className="mb-[13px]">
        <label className="block text-[9px] tracking-[2px] uppercase mb-[7px]"
          style={{ fontFamily: 'var(--font-mono), monospace', color: 'var(--muted2)' }}>
          I am currently
        </label>
        <div className="grid grid-cols-2 gap-[9px]">
          {([
            { value: 'student', icon: '🎓', label: 'Student' },
            { value: 'professional', icon: '💼', label: 'Working Professional' },
          ] as const).map((opt) => (
            <label key={opt.value} className="cursor-pointer">
              <input type="radio" name="role" value={opt.value}
                checked={role === opt.value}
                onChange={() => setRole(opt.value)}
                className="absolute opacity-0 pointer-events-none" />
              <div
                className="flex flex-col items-center gap-[6px] py-[14px] px-[8px] rounded-[7px] text-center transition-all duration-200"
                style={{
                  background: 'var(--surface)',
                  border: role === opt.value ? '1px solid var(--gold)' : '1px solid var(--border)',
                  boxShadow: role === opt.value ? '0 0 0 2px var(--gold-md)' : '',
                  ...(role === opt.value ? { background: 'var(--gold-lo)' } : {}),
                }}
              >
                <span className="text-[20px]">{opt.icon}</span>
                <span className="text-[11px] font-semibold tracking-[0.3px]" style={{ color: 'var(--text)' }}>{opt.label}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Year of study */}
      {role === 'student' && (
        <div className="mb-[13px]">
          <label className="block text-[9px] tracking-[2px] uppercase mb-[7px]"
            style={{ fontFamily: 'var(--font-mono), monospace', color: 'var(--muted2)' }}>
            Year of Study
          </label>
          <div className="relative">
            <select
              value={yearOfStudy}
              onChange={(e) => setYearOfStudy(e.target.value)}
              className="w-full text-[13px] outline-none transition-all duration-200 rounded-[7px] cursor-pointer appearance-none"
              style={{
                padding: '11px 32px 11px 12px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: yearOfStudy ? 'var(--text)' : 'var(--muted)',
                fontFamily: 'var(--font-manrope), sans-serif',
              }}
            >
              <option value="">Select year...</option>
              {['1st Year', '2nd Year', '3rd Year', '4th Year', 'Final Year', 'PG / Masters'].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span className="absolute right-[11px] top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted)' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </span>
          </div>
        </div>
      )}

      {/* Skills */}
      <div className="mb-[13px]">
        <label className="block text-[9px] tracking-[2px] uppercase mb-[7px]"
          style={{ fontFamily: 'var(--font-mono), monospace', color: 'var(--muted2)' }}>
          Your Skills{' '}
          <span className="text-[8px]" style={{ color: 'var(--muted)' }}>(TYPE + ENTER TO ADD)</span>
        </label>
        <SkillTagger skills={skills} onAdd={addSkill} onRemove={removeSkill} />
      </div>

      {/* Interests */}
      <div className="mb-[13px]">
        <label className="block text-[9px] tracking-[2px] uppercase mb-[7px]"
          style={{ fontFamily: 'var(--font-mono), monospace', color: 'var(--muted2)' }}>
          Areas of Interest
        </label>
        <InterestTagger interests={interests} onAdd={addInterest} onRemove={removeInterest} />
      </div>

      {/* Terms */}
      <div className="flex items-start gap-[9px] my-[10px]">
        <div className="relative w-4 h-4 flex-shrink-0 mt-[1px]">
          <input type="checkbox" id="terms" checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" />
          <div
            className="absolute inset-0 flex items-center justify-center rounded-[3px] transition-all duration-200"
            style={{
              background: termsAccepted ? 'var(--gold)' : 'var(--surface)',
              border: termsAccepted ? '1px solid var(--gold)' : '1px solid var(--border)',
            }}
          >
            {termsAccepted && (
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#08090f" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </div>
        <label htmlFor="terms" className="text-[11px] font-light leading-[1.6] cursor-pointer" style={{ color: 'var(--muted2)' }}>
          I agree to the{' '}
          <a href="#" className="no-underline transition-colors hover:underline" style={{ color: 'var(--gold)' }}>Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="no-underline transition-colors hover:underline" style={{ color: 'var(--gold)' }}>Privacy Policy</a>
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-[9px] items-end">
        <button
          onClick={() => setStep(1)}
          className="w-[42px] h-[42px] flex-shrink-0 flex items-center justify-center rounded-[7px] mt-[16px] cursor-pointer transition-all duration-200"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted2)' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--gold-hi)'; e.currentTarget.style.color = 'var(--gold)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted2)' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button
          onClick={handleSignup}
          className="flex-1 relative flex items-center justify-center gap-2 mt-[16px] rounded-[7px] font-bold text-[16px] tracking-[0.5px] cursor-pointer transition-all duration-300"
          style={{ padding: '13px 20px', background: 'var(--gold)', color: 'var(--ink)', border: 'none', fontFamily: 'var(--font-playfair), Georgia, serif' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(232,201,122,0.3)' }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
        >
          {loading ? (
            <span className="flex items-center gap-2 text-[11px] tracking-[1px]"
              style={{ fontFamily: 'var(--font-mono), monospace' }}>
              <span className="spin-ring w-4 h-4 rounded-full" style={{ border: '2px solid rgba(8,9,15,0.25)', borderTopColor: 'var(--ink)' }} />
              Creating...
            </span>
          ) : 'Create Account 🎉'}
        </button>
      </div>
    </div>
  )
}
