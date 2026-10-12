'use client'

export function LeftPanel() {
  const skills = [
    'MySQL', 'React.js', 'Python', 'Node.js', 'MongoDB',
    'Docker', 'TypeScript', 'HTML/CSS', 'FastAPI',
  ]

  return (
    <div
      className="relative flex flex-col p-[52px_56px] overflow-hidden"
      style={{
        background: 'var(--deep)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Noise texture */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
        }}
      />
      {/* Diagonal line */}
      <div
        className="absolute pointer-events-none z-0"
        style={{
          top: '-10%', left: '60%', width: '1px', height: '130%',
          background: 'linear-gradient(180deg,transparent,rgba(232,201,122,0.12) 30%,rgba(232,201,122,0.06) 70%,transparent)',
          transform: 'rotate(8deg)',
        }}
      />

      {/* Blobs */}
      <div
        className="blob-1 absolute rounded-full pointer-events-none z-0"
        style={{
          width: 420, height: 420,
          background: 'rgba(232,201,122,0.07)',
          filter: 'blur(90px)',
          top: -80, left: -120,
        }}
      />
      <div
        className="blob-2 absolute rounded-full pointer-events-none z-0"
        style={{
          width: 300, height: 300,
          background: 'rgba(79,209,197,0.05)',
          filter: 'blur(90px)',
          bottom: 0, right: -60,
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Brand */}
        <div className="flex items-center gap-[14px]">
          <div
            className="flex items-center justify-center w-[42px] h-[42px] rounded-[8px] flex-shrink-0"
            style={{ border: '1.5px solid var(--gold)' }}
          >
            <span
              className="text-[13px] font-bold tracking-[0.5px]"
              style={{
                fontFamily: 'var(--font-playfair), Georgia, serif',
                color: 'var(--gold)',
              }}
            >
              SS
            </span>
          </div>
          <span
            className="text-[22px] font-bold tracking-[0.5px]"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif', color: 'var(--text)' }}
          >
            SkillSync
          </span>
          <span
            className="text-[9px] tracking-[2px] px-[7px] py-[2px] rounded-[3px]"
            style={{
              fontFamily: 'var(--font-mono), monospace',
              color: 'var(--gold)',
              background: 'var(--gold-lo)',
              border: '1px solid var(--gold-hi)',
            }}
          >
            BETA
          </span>
        </div>

        {/* Hero */}
        <div className="flex-1 flex flex-col justify-center py-[56px_0_40px]">
          <div
            className="flex items-center gap-[12px] text-[10px] tracking-[3px] uppercase mb-[24px]"
            style={{ fontFamily: 'var(--font-mono), monospace', color: 'var(--gold)' }}
          >
            AI-Powered Assessment Platform
            <span
              className="flex-1 max-w-[48px] h-px opacity-50"
              style={{ background: 'var(--gold)' }}
            />
          </div>

          <h1
            className="font-black leading-[0.95] tracking-[-1px] mb-[8px]"
            style={{
              fontFamily: 'var(--font-playfair), Georgia, serif',
              fontSize: 'clamp(52px, 6vw, 82px)',
              color: 'var(--text)',
            }}
          >
            Prove<br />your<br />
            <span className="italic" style={{ color: 'var(--gold)' }}>skill.</span><br />
            <span style={{ WebkitTextStroke: '1.5px rgba(232,201,122,0.4)', color: 'transparent' }}>Win.</span>
          </h1>

          <p
            className="text-[14px] font-light leading-[1.8] max-w-[340px] my-[28px]"
            style={{ color: 'var(--muted2)' }}
          >
            Adaptive AI tests that measure exactly where you stand — then match
            you with the perfect hackathon team to dominate every challenge.
          </p>

          <div className="grid grid-cols-3 gap-[8px] justify-start mb-[48px]">
            {skills.map((sk) => (
              <span
                key={sk}
                className="group inline-flex items-center gap-[7px] px-[13px] py-[6px] rounded-[5px] text-[11px] cursor-default transition-all duration-300 hover:translate-x-[3px]"
                style={{
                  fontFamily: 'var(--font-mono), monospace',
                  color: 'var(--muted2)',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border)',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLSpanElement
                  el.style.borderColor = 'var(--gold-hi)'
                  el.style.color = 'var(--gold)'
                  el.style.background = 'var(--gold-lo)'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLSpanElement
                  el.style.borderColor = 'var(--border)'
                  el.style.color = 'var(--muted2)'
                  el.style.background = 'rgba(255,255,255,0.02)'
                }}
              >
                <span
                  className="w-1 h-1 rounded-full flex-shrink-0"
                  style={{ background: 'var(--gold)', opacity: 0.5 }}
                />
                {sk}
              </span>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
