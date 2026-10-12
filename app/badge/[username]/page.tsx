'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PublicProfile, BADGE_VALIDITY_DAYS } from '@/types'

const LEVEL_COLORS: Record<string, string> = { easy: '#4fd1c5', medium: '#e8c97a', hard: '#ff6b81' }

function isExpired(verifiedAt?: string) {
  if (!verifiedAt) return false
  const ms = Date.now() - new Date(verifiedAt).getTime()
  return ms > BADGE_VALIDITY_DAYS * 24 * 60 * 60 * 1000
}

export default function PublicBadgePage() {
  const params = useParams<{ username: string }>()
  const username = decodeURIComponent(params.username)
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.rpc('get_public_profile', { p_username: username })
      if (error || !data || data.length === 0) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const first = data[0]
      setProfile({
        fullName: first.full_name,
        username: first.username,
        avatarUrl: first.avatar_url,
        bio: first.bio,
        role: first.role,
        skills: data.map((d: any) => ({
          skill: d.skill_name,
          easyCompleted: d.easy_completed,
          mediumCompleted: d.medium_completed,
          hardCompleted: d.hard_completed,
          easyScore: d.easy_score,
          mediumScore: d.medium_score,
          hardScore: d.hard_score,
          easyVerifiedAt: d.easy_verified_at,
          mediumVerifiedAt: d.medium_verified_at,
          hardVerifiedAt: d.hard_verified_at,
        })),
      })
      setLoading(false)
    }
    load()
  }, [username])

  const drawBadgeToCanvas = (skillName: string, level: string, score: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = 1000
    canvas.height = 560

    const grad = ctx.createLinearGradient(0, 0, 1000, 560)
    grad.addColorStop(0, '#0c0d17')
    grad.addColorStop(1, '#14152b')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 1000, 560)

    ctx.strokeStyle = 'rgba(232,201,122,0.5)'
    ctx.lineWidth = 3
    ctx.strokeRect(24, 24, 952, 512)

    ctx.fillStyle = '#e8c97a'
    ctx.font = 'bold 28px Georgia, serif'
    ctx.fillText('SkillSync — Verified Skill Certificate', 60, 100)

    ctx.fillStyle = '#dde2ef'
    ctx.font = 'bold 56px Georgia, serif'
    ctx.fillText(skillName, 60, 210)

    ctx.fillStyle = LEVEL_COLORS[level] || '#4fd1c5'
    ctx.font = 'bold 32px monospace'
    ctx.fillText(`${level.toUpperCase()} LEVEL — ${Math.round(score * 100)}%`, 60, 270)

    ctx.fillStyle = '#7e889e'
    ctx.font = '22px monospace'
    ctx.fillText(`Awarded to ${profile?.fullName} (@${profile?.username})`, 60, 340)
    ctx.fillText(`Verified: ${new Date().toLocaleDateString()}`, 60, 380)

    ctx.fillStyle = '#555a70'
    ctx.font = '16px monospace'
    ctx.fillText('skillsync.app — AI-powered skill verification', 60, 500)

    const link = document.createElement('a')
    link.download = `${profile?.username}-${skillName}-${level}-badge.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#08090f' }}>
        <div className="spin-ring w-8 h-8 rounded-full" style={{ border: '2px solid rgba(255,255,255,0.06)', borderTopColor: '#e8c97a' }} />
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#08090f', color: '#dde2ef' }}>
        <div className="text-center">
          <p className="text-4xl mb-4">🔍</p>
          <p className="font-semibold">No public SkillSync profile found for @{username}</p>
        </div>
      </div>
    )
  }

  const verifiedSkills = profile.skills.filter((s) => s.easyCompleted || s.mediumCompleted || s.hardCompleted)

  return (
    <div className="min-h-screen p-6" style={{ background: '#08090f', color: '#dde2ef' }}>
      <canvas ref={canvasRef} className="hidden" />
      <div className="max-w-3xl mx-auto">
        <div className="rounded-3xl p-8 mb-6" style={{ background: '#14152b', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif', color: '#e8c97a' }}>{profile.fullName}</h1>
              <p className="text-sm" style={{ color: '#7e889e', fontFamily: 'monospace' }}>@{profile.username} · {profile.role}</p>
              {profile.bio && <p className="text-sm mt-2 max-w-lg" style={{ color: '#dde2ef' }}>{profile.bio}</p>}
            </div>
            <button
              onClick={copyLink}
              className="px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ background: '#10111e', border: '1px solid rgba(255,255,255,0.06)', color: '#dde2ef' }}
            >
              {copied ? '✓ Link copied' : '🔗 Copy share link'}
            </button>
          </div>
        </div>

        <h2 className="text-sm font-semibold mb-3" style={{ color: '#7e889e', fontFamily: 'monospace' }}>VERIFIED SKILLS</h2>

        {verifiedSkills.length === 0 ? (
          <p className="text-sm" style={{ color: '#555a70' }}>No verified skills yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {verifiedSkills.map((s) => {
              const levels: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard']
              const topLevel = [...levels].reverse().find((l) => (s as any)[`${l}Completed`])!
              const score = (s as any)[`${topLevel}Score`] as number
              const verifiedAt = (s as any)[`${topLevel}VerifiedAt`] as string | undefined
              const expired = isExpired(verifiedAt)
              return (
                <div key={s.skill} className="rounded-2xl p-5" style={{ background: '#14152b', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold">{s.skill}</h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full capitalize font-semibold"
                      style={{ background: `${LEVEL_COLORS[topLevel]}20`, color: LEVEL_COLORS[topLevel] }}
                    >
                      {topLevel}
                    </span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: '#e8c97a' }}>{Math.round((score || 0) * 100)}%</p>
                  {verifiedAt && (
                    <p className="text-xs mt-1" style={{ color: expired ? '#ff6b81' : '#7e889e' }}>
                      {expired ? '⚠ Re-verification recommended' : `Verified ${new Date(verifiedAt).toLocaleDateString()}`}
                    </p>
                  )}
                  <button
                    onClick={() => drawBadgeToCanvas(s.skill, topLevel, score || 0)}
                    className="mt-3 w-full py-2 rounded-lg text-xs font-semibold"
                    style={{ background: '#10111e', border: '1px solid rgba(255,255,255,0.06)', color: '#dde2ef' }}
                  >
                    ⬇ Download badge (PNG)
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
