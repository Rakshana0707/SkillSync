'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'

const AlertIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-[13px]">
      <label className="block text-[9px] tracking-[2px] uppercase mb-[7px]"
        style={{ fontFamily: 'var(--font-mono), monospace', color: 'var(--muted2)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  fontFamily: 'var(--font-manrope), sans-serif',
}

function StyledInput({
  type = 'text', value, onChange, placeholder, autoComplete, icon, suffix,
  paddingLeft = '38px',
}: {
  type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; autoComplete?: string;
  icon?: React.ReactNode; suffix?: React.ReactNode; paddingLeft?: string;
}) {
  return (
    <div className="relative flex items-center">
      {icon && <span className="absolute left-3 pointer-events-none" style={{ color: 'var(--muted)' }}>{icon}</span>}
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} autoComplete={autoComplete}
        className="w-full text-[13px] outline-none transition-all duration-200 rounded-[7px]"
        style={{ ...inputStyle, padding: `11px 12px 11px ${paddingLeft}` }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--gold-hi)'
          e.target.style.boxShadow = '0 0 0 3px var(--gold-md)'
          e.target.style.background = 'rgba(232,201,122,0.025)'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--border)'
          e.target.style.boxShadow = ''
          e.target.style.background = 'var(--surface)'
        }}
      />
      {suffix}
    </div>
  )
}

export function SignupStep1() {
  const { step1Data, setStep1Data, setStep, setError } = useAuthStore()
  const [showPw, setShowPw] = useState(false)
  const [error, setLocalError] = useState<string | null>(null)

  const toStep2 = () => {
    const { fullName, username, email, password } = step1Data
    if (!fullName || !username || !email || !password) {
      setLocalError('Please fill in all required fields.'); return
    }
    if (!/\S+@\S+\.\S+/.test(email)) { setLocalError('Enter a valid email address.'); return }
    if (password.length < 8) { setLocalError('Password must be at least 8 characters.'); return }
    setLocalError(null)
    setStep(2)
  }

  const EyeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  )

  return (
    <div className="pane-in">
      <div className="font-bold leading-[1.05] tracking-[-0.5px] mb-[5px] text-[32px]"
        style={{ fontFamily: 'var(--font-playfair), Georgia, serif', color: 'var(--text)' }}>
        Join the <em className="italic" style={{ color: 'var(--gold)' }}>arena.</em>
      </div>
      <div className="text-[12px] font-light tracking-[0.2px] mb-[26px]" style={{ color: 'var(--muted2)' }}>
        Step 1 of 2 — Account details.
      </div>

      {error && (
        <div className="slide-down flex items-center gap-2 px-[13px] py-[10px] rounded-[7px] text-[12px] mb-[14px]"
          style={{ background: 'rgba(255,107,129,0.08)', border: '1px solid rgba(255,107,129,0.2)', color: 'var(--err)' }}>
          <AlertIcon /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-[11px]">
        <Field label="Full Name">
          <StyledInput
            value={step1Data.fullName} onChange={(v) => setStep1Data({ fullName: v })}
            placeholder="Arjun Kumar" autoComplete="name"
            paddingLeft="38px"
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
          />
        </Field>
        <Field label="Username">
          <div className="relative flex items-center">
            <span className="absolute left-[11px] text-[12px] pointer-events-none" style={{ fontFamily: 'var(--font-mono), monospace', color: 'var(--gold)' }}>@</span>
            <input
              type="text" value={step1Data.username}
              onChange={(e) => setStep1Data({ username: e.target.value })}
              placeholder="arjun_dev"
              className="w-full text-[13px] outline-none transition-all duration-200 rounded-[7px]"
              style={{ ...inputStyle, padding: '11px 12px 11px 26px' }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--gold-hi)'; e.target.style.boxShadow = '0 0 0 3px var(--gold-md)'; e.target.style.background = 'rgba(232,201,122,0.025)' }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = ''; e.target.style.background = 'var(--surface)' }}
            />
          </div>
        </Field>
      </div>

      <Field label="Email">
        <StyledInput type="email" value={step1Data.email} onChange={(v) => setStep1Data({ email: v })}
          placeholder="arjun@example.com" autoComplete="email"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>}
        />
      </Field>

      <Field label="Mobile Number">
        <StyledInput type="tel" value={step1Data.phone} onChange={(v) => setStep1Data({ phone: v })}
          placeholder="+91 98765 43210"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeLinecap="round" strokeWidth="2.5"/></svg>}
        />
      </Field>

      <Field label="Password">
        <div className="relative flex items-center">
          <span className="absolute left-3 pointer-events-none" style={{ color: 'var(--muted)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </span>
          <input
            type={showPw ? 'text' : 'password'} value={step1Data.password}
            onChange={(e) => setStep1Data({ password: e.target.value })}
            placeholder="Min. 8 characters" autoComplete="new-password"
            className="w-full text-[13px] outline-none transition-all duration-200 rounded-[7px]"
            style={{ ...inputStyle, padding: '11px 38px 11px 38px' }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--gold-hi)'; e.target.style.boxShadow = '0 0 0 3px var(--gold-md)'; e.target.style.background = 'rgba(232,201,122,0.025)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = ''; e.target.style.background = 'var(--surface)' }}
          />
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="absolute right-[11px] flex p-0 border-none bg-transparent cursor-pointer transition-colors duration-200"
            style={{ color: 'var(--muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}>
            <EyeIcon />
          </button>
        </div>
      </Field>

      <button onClick={toStep2}
        className="w-full flex items-center justify-center gap-2 mt-[16px] rounded-[7px] font-bold text-[16px] tracking-[0.5px] cursor-pointer transition-all duration-300"
        style={{ padding: '13px 20px', background: 'var(--gold)', color: 'var(--ink)', border: 'none', fontFamily: 'var(--font-playfair), Georgia, serif' }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(232,201,122,0.3)' }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
        Continue →
      </button>
    </div>
  )
}
