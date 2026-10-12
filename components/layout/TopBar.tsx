'use client'

import { useAppStore } from '@/store/appStore'

interface TopBarProps {
  title: string
  subtitle?: string
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const { setSidebarOpen } = useAppStore()

  return (
    <header
      className="flex items-center justify-between px-6 py-4 sticky top-0 z-30 print-hide"
      style={{ background: 'var(--ink)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-4">
        {/* Mobile hamburger */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden flex flex-col gap-1.5 p-1"
          style={{ color: 'var(--muted2)' }}
        >
          <span className="block w-5 h-0.5 bg-current" />
          <span className="block w-5 h-0.5 bg-current" />
          <span className="block w-5 h-0.5 bg-current" />
        </button>
        <div>
          <h1 className="text-lg font-bold" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--text)' }}>{title}</h1>
          {subtitle && <p className="text-xs" style={{ color: 'var(--muted2)' }}>{subtitle}</p>}
        </div>
      </div>
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] tracking-widest"
        style={{ background: 'var(--teal-lo)', border: '1px dashed rgba(79,209,197,0.2)', fontFamily: 'var(--font-mono)', color: 'rgba(79,209,197,0.5)' }}
      >
        <span className="pulse-dot w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--teal)' }} />
        LIVE
      </div>
    </header>
  )
}
