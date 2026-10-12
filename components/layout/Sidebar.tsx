'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useAppStore } from '@/store/appStore'

const NAV = [
  { href: '/dashboard', icon: '⬡', label: 'Dashboard' },
  { href: '/test', icon: '◈', label: 'Take Test' },
  { href: '/leaderboard', icon: '☰', label: 'Leaderboard' },
  { href: '/hackathon', icon: '⚡', label: 'Hackathon' },
  { href: '/profile', icon: '◉', label: 'Profile' },
  { href: '/settings', icon: '◎', label: 'Settings' },
]

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { profile, sidebarOpen, setSidebarOpen } = useAppStore()

  const handleLogout = () => {
    // Clear localStorage session (no Supabase Auth needed)
    localStorage.removeItem('skillsync_profile')
    localStorage.removeItem('skillsync_progress')
    router.push('/')
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(8,9,15,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} print-hide`}
        style={{
          width: 220,
          background: 'var(--deep)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ background: 'var(--gold)', color: 'var(--ink)' }}
          >
            SS
          </div>
          <span className="font-bold text-sm tracking-wide" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--gold)' }}>
            SkillSync
          </span>
        </div>

        {/* User chip */}
        <div className="px-4 py-3 mx-3 my-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: 'var(--gold-md)', color: 'var(--gold)', border: '1px solid var(--gold-hi)' }}
            >
              {profile?.full_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{profile?.full_name || 'User'}</p>
              <p className="text-[10px] truncate" style={{ color: 'var(--muted2)', fontFamily: 'var(--font-mono)' }}>@{profile?.username || 'user'}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 flex flex-col gap-1">
          {NAV.map(({ href, icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <button
                key={href}
                onClick={() => { router.push(href); setSidebarOpen(false) }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 text-left w-full"
                style={{
                  background: active ? 'var(--gold-lo)' : 'transparent',
                  color: active ? 'var(--gold)' : 'var(--muted2)',
                  border: active ? '1px solid var(--gold-md)' : '1px solid transparent',
                }}
              >
                <span className="text-base w-5 text-center">{icon}</span>
                {label}
              </button>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium w-full transition-all duration-150"
            style={{ color: 'var(--err)', border: '1px solid rgba(255,107,129,0.15)' }}
          >
            <span className="text-base w-5 text-center">↩</span>
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}
