'use client'

import { useState, useRef, useEffect } from 'react'
import { INTERESTS_LIST } from '@/types'

interface InterestTaggerProps {
  interests: string[]
  onAdd: (interest: string) => void
  onRemove: (interest: string) => void
}

export function InterestTagger({ interests, onAdd, onRemove }: InterestTaggerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const filtered = INTERESTS_LIST.filter(
    (i) =>
      i.toLowerCase().includes(query.toLowerCase()) &&
      !interests.includes(i)
  ).slice(0, 5)

  const handleAdd = (interest: string) => {
    onAdd(interest)
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      handleAdd(query.trim())
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
      {interests.map((i) => (
        <span
          key={i}
          className="chip-pop inline-flex items-center gap-1 px-[9px] py-[2px] rounded-[4px] text-[10px]"
          style={{
            fontFamily: 'var(--font-mono), monospace',
            background: 'var(--gold-lo)',
            color: 'var(--gold)',
            border: '1px solid var(--gold-hi)',
          }}
        >
          {i}
          <span
            className="cursor-pointer opacity-40 hover:opacity-100 text-sm leading-none transition-opacity"
            onClick={(e) => { e.stopPropagation(); onRemove(i) }}
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
        placeholder={interests.length === 0 ? 'e.g. Web Dev, AI/ML, DevOps...' : ''}
        className="flex-1 min-w-[80px] bg-transparent border-none outline-none text-[12px] placeholder:text-[var(--muted)]"
        style={{ color: 'var(--text)', fontFamily: 'var(--font-manrope), sans-serif' }}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+5px)] rounded-[7px] z-50 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          {filtered.map((i) => (
            <div
              key={i}
              className="px-[13px] py-[9px] cursor-pointer text-[12px] transition-all duration-100"
              style={{ color: 'var(--muted2)' }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleAdd(i)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = 'var(--gold-lo)'
                ;(e.currentTarget as HTMLDivElement).style.color = 'var(--gold)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = ''
                ;(e.currentTarget as HTMLDivElement).style.color = 'var(--muted2)'
              }}
            >
              {i}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
