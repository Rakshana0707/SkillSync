'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { useAppStore } from '@/store/appStore'

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { setProfile, theme, setTheme } = useAppStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Check if user is logged in via localStorage (no Supabase Auth)
    const stored = localStorage.getItem('skillsync_profile')
    if (!stored) {
      router.push('/')
      return
    }
    try {
      const parsed = JSON.parse(stored)
      setProfile(parsed)
      if (parsed.theme) setTheme(parsed.theme)
      setReady(true)
    } catch (err) {
      console.error('Failed to parse profile from localStorage:', err)
      localStorage.removeItem('skillsync_profile')
      router.push('/')
    }
  }, [router, setProfile])

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
  }, [theme])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ink)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="spin-ring w-8 h-8 rounded-full" style={{ border: '2px solid var(--border)', borderTopColor: 'var(--gold)' }} />
          <p className="text-xs" style={{ color: 'var(--muted2)', fontFamily: 'var(--font-mono)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--ink)' }}>
      <Sidebar />
      <main className="flex-1 lg:ml-[220px] min-h-screen">
        {children}
      </main>
    </div>
  )
}
