import { LeftPanel } from '@/components/auth/LeftPanel'
import { AuthShell } from '@/components/auth/AuthShell'

export default function Home() {
  return (
    <div className="grid min-h-screen" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div className="hidden lg:block">
        <LeftPanel />
      </div>
      <div
        className="flex items-center justify-center relative"
        style={{ padding: '48px 44px', background: 'var(--ink)' }}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            width: 500, height: 500,
            background: 'radial-gradient(circle, rgba(232,201,122,0.04) 0%, transparent 70%)',
          }}
        />
        <AuthShell />
      </div>
    </div>
  )
}
