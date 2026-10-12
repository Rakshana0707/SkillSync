'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, hashPassword } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EmailIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m2 7 10 7 10-7" />
  </svg>
)

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

export function LoginPane() {
  const router = useRouter()
  const { setSuccess } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true); setError(null)
    try {
      // Hash the password and look up the user directly in the profiles table
      const pwHash = await hashPassword(password)

      const { data: profile, error: dbError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .eq('password_hash', pwHash)
        .single()

      if (dbError || !profile) {
        setError('Invalid email or password.')
        setLoading(false)
        return
      }

      // Load skills and interests for localStorage
      const [skillsRes, interestsRes] = await Promise.all([
        supabase.from('user_skills').select('skill_name, category').eq('user_id', profile.id),
        supabase.from('user_interests').select('interest_name').eq('user_id', profile.id),
      ])

      const localProfile = {
        id: profile.id,
        full_name: profile.full_name,
        username: profile.username,
        email: profile.email,
        phone: profile.phone,
        avatar_url: profile.avatar_url || '🦊',
        bio: profile.bio || '',
        role: profile.role,
        year_of_study: profile.year_of_study,
        theme: profile.theme || 'dark',
        skills: (skillsRes.data || []).map((s: any) => ({ n: s.skill_name, c: s.category })),
        interests: (interestsRes.data || []).map((i: any) => i.interest_name),
        created_at: profile.created_at,
      }
      localStorage.setItem('skillsync_profile', JSON.stringify(localProfile))

      setLoading(false)
      router.push('/dashboard')
    } catch {
      setError('An unexpected error occurred.')
      setLoading(false)
    }
  }

  const inputStyle = {
    padding: '11px 12px 11px 38px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontFamily: 'var(--font-manrope), sans-serif',
  }

  return (
    <div className="pane-in">
      <div className="font-bold leading-[1.05] tracking-[-0.5px] mb-[5px] text-[32px]"
        style={{ fontFamily: 'var(--font-playfair), Georgia, serif', color: 'var(--text)' }}>
        Welcome <em className="italic" style={{ color: 'var(--gold)' }}>back.</em>
      </div>
      <div className="text-[12px] font-light tracking-[0.2px] mb-[26px]" style={{ color: 'var(--muted2)' }}>
        Continue your skill journey where you left off.
      </div>

      {error && (
        <div className="slide-down flex items-center gap-2 px-[13px] py-[10px] rounded-[7px] text-[12px] mb-[14px]"
          style={{ background: 'rgba(255,107,129,0.08)', border: '1px solid rgba(255,107,129,0.2)', color: 'var(--err)' }}>
          ⚠ {error}
        </div>
      )}

      <div className="mb-[13px]">
        <label className="block text-[9px] tracking-[2px] uppercase mb-[7px]"
          style={{ fontFamily: 'var(--font-mono), monospace', color: 'var(--muted2)' }}>Email</label>
        <div className="relative flex items-center">
          <span className="absolute left-3 pointer-events-none" style={{ color: 'var(--muted)' }}><EmailIcon /></span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" autoComplete="email"
            className="w-full text-[13px] font-normal outline-none transition-all duration-200 rounded-[7px]"
            style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = 'var(--gold-hi)'; e.target.style.boxShadow = '0 0 0 3px var(--gold-md)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = '' }}
          />
        </div>
      </div>

      <div className="mb-[13px]">
        <label className="block text-[9px] tracking-[2px] uppercase mb-[7px]"
          style={{ fontFamily: 'var(--font-mono), monospace', color: 'var(--muted2)' }}>Password</label>
        <div className="relative flex items-center">
          <span className="absolute left-3 pointer-events-none" style={{ color: 'var(--muted)' }}><LockIcon /></span>
          <input type={showPw ? 'text' : 'password'} value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="Your password"
            autoComplete="current-password" onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full text-[13px] font-normal outline-none transition-all duration-200 rounded-[7px]"
            style={{ ...inputStyle, padding: '11px 38px 11px 38px' }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--gold-hi)'; e.target.style.boxShadow = '0 0 0 3px var(--gold-md)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = '' }}
          />
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="absolute right-[11px] flex p-0 border-none bg-transparent cursor-pointer"
            style={{ color: 'var(--muted)' }}>
            <EyeIcon />
          </button>
        </div>
      </div>

      <button onClick={handleLogin}
        className="relative w-full overflow-hidden flex items-center justify-center gap-2 mt-[16px] rounded-[7px] font-bold text-[16px] tracking-[0.5px] cursor-pointer transition-all duration-300"
        style={{ padding: '13px 20px', background: 'var(--gold)', color: 'var(--ink)', border: 'none', fontFamily: 'var(--font-playfair), Georgia, serif' }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(232,201,122,0.3)' }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
      >
        {loading ? (
          <span className="flex items-center gap-2 text-[11px] tracking-[1px]" style={{ fontFamily: 'var(--font-mono), monospace' }}>
            <span className="spin-ring w-4 h-4 rounded-full" style={{ border: '2px solid rgba(8,9,15,0.25)', borderTopColor: 'var(--ink)' }} />
            Signing in...
          </span>
        ) : 'Sign In →'}
      </button>
    </div>
  )
}
