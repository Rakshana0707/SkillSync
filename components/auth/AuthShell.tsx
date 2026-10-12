'use client'

import { useAuthStore } from '@/store/authStore'
import { LoginPane } from './LoginPane'
import { SignupStep1 } from './SignupStep1'
import { SignupStep2 } from './SignupStep2'

export function AuthShell() {
  const { tab, setTab, step, success, successMsg } = useAuthStore()

  if (success) {
    return (
      <div className="flex flex-col items-center text-center py-[40px] gap-[14px]">
        <div
          className="big-pop w-[70px] h-[70px] rounded-full flex items-center justify-center text-[28px]"
          style={{ border: '2px solid var(--gold)', background: 'var(--gold-lo)' }}
        >
          ✓
        </div>
        <div
          className="text-[28px] font-bold italic tracking-[-0.3px]"
          style={{ fontFamily: 'var(--font-playfair), Georgia, serif', color: 'var(--gold)' }}
        >
          You're in!
        </div>
        <p className="text-[13px] font-light leading-[1.7] max-w-[260px]" style={{ color: 'var(--muted2)' }}>
          {successMsg}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[390px] relative z-10">
      {/* Supabase pill */}
      <div
        className="flex items-center gap-2 px-[13px] py-[8px] rounded-[7px] text-[9px] tracking-[1px] mb-[28px]"
        style={{
          background: 'var(--teal-lo)',
          border: '1px dashed rgba(79,209,197,0.2)',
          fontFamily: 'var(--font-mono), monospace',
          color: 'rgba(79,209,197,0.4)',
        }}
      >
        <span
          className="pulse-dot w-[6px] h-[6px] rounded-full flex-shrink-0"
          style={{ background: 'var(--teal)' }}
        />
        SUPABASE · CONNECTED
      </div>

      {/* Tab switcher */}
      <div
        className="flex p-1 rounded-[10px] mb-[32px]"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {(['login', 'signup'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-[10px] rounded-[8px] text-[13px] font-semibold tracking-[0.3px] cursor-pointer transition-all duration-200 border-none"
            style={{
              background: tab === t ? 'var(--gold)' : 'transparent',
              color: tab === t ? 'var(--ink)' : 'var(--muted2)',
              fontFamily: 'var(--font-manrope), sans-serif',
            }}
          >
            {t === 'login' ? 'Sign In' : 'Register'}
          </button>
        ))}
      </div>

      {/* Step progress (signup only) */}
      {tab === 'signup' && (
        <div className="flex items-center gap-[6px] mb-[24px]">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="flex-1 h-[3px] rounded-[3px] transition-all duration-400"
              style={{
                background:
                  step === n ? 'var(--gold)' :
                  step > n ? 'rgba(232,201,122,0.4)' :
                  'var(--border)',
              }}
            />
          ))}
          <span
            className="text-[9px] tracking-[2px] uppercase ml-[6px] flex-shrink-0"
            style={{ fontFamily: 'var(--font-mono), monospace', color: 'var(--muted)' }}
          >
            0{step} / 02
          </span>
        </div>
      )}

      {/* Pane content */}
      {tab === 'login' && <LoginPane />}
      {tab === 'signup' && step === 1 && <SignupStep1 />}
      {tab === 'signup' && step === 2 && <SignupStep2 />}
    </div>
  )
}
