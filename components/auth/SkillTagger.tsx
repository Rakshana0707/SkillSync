'use client'

import { useState, useRef, useEffect } from 'react'
import { Skill, SKILLS_LIST } from '@/types'

interface SkillTaggerProps {
  skills: Skill[]
  onAdd: (skill: Skill) => void
  onRemove: (name: string) => void
}

export function SkillTagger({ skills, onAdd, onRemove }: SkillTaggerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const filtered = SKILLS_LIST.filter(
    (s) =>
      s.n.toLowerCase().includes(query.toLowerCase()) &&
      !skills.find((u) => u.n === s.n)
  ).slice(0, 7)

  const handleAdd = (skill: Skill) => {
    onAdd(skill)
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      handleAdd({ n: query.trim(), c: 'Custom' })
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div
      ref={wrapRef}
      className="relative flex flex-wrap gap-[5px] cursor-text min-h-[44px] items-start content-start p-[7px] rounded-[7px] transition-all duration-200"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {skills.map((s) => (
        <span
          key={s.n}
          className="chip-pop inline-flex items-center gap-1 px-[9px] py-[2px] rounded-[4px] text-[10px]"
          style={{
            fontFamily: 'var(--font-mono), monospace',
            background: 'var(--gold-lo)',
            color: 'var(--gold)',
            border: '1px solid var(--gold-hi)',
          }}
        >
          {s.n}
          <span
            className="cursor-pointer opacity-40 hover:opacity-100 text-sm leading-none transition-opacity"
            onClick={(e) => { e.stopPropagation(); onRemove(s.n) }}
          >
            ×
          </span>
        </span>
      ))}
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(e.target.value.length > 0) }}
        onKeyDown={handleKey}
        placeholder={skills.length === 0 ? 'e.g. MySQL, React, Python...' : ''}
        className="flex-1 min-w-[80px] bg-transparent border-none outline-none text-[12px] placeholder:text-[var(--muted)]"
        style={{ color: 'var(--text)', fontFamily: 'var(--font-manrope), sans-serif' }}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+5px)] rounded-[7px] z-50 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          {filtered.map((s) => (
            <div
              key={s.n}
              className="flex items-center justify-between px-[13px] py-[9px] cursor-pointer text-[12px] transition-all duration-100"
              style={{ color: 'var(--muted2)' }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleAdd(s)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = 'var(--gold-lo)'
                ;(e.currentTarget as HTMLDivElement).style.color = 'var(--gold)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = ''
                ;(e.currentTarget as HTMLDivElement).style.color = 'var(--muted2)'
              }}
            >
              {s.n}
              <span
                className="text-[8px] tracking-[1.5px] uppercase"
                style={{ fontFamily: 'var(--font-mono), monospace', color: 'var(--muted)' }}
              >
                {s.c}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
