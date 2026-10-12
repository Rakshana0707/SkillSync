'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Question, QuestionLevel, TIME_LIMITS, PASS_THRESHOLD, RETEST_COOLDOWN_MINUTES, SkillProgress } from '@/types'
import { useAppStore } from '@/store/appStore'
import { supabase } from '@/lib/supabase'
import { Proctoring } from '@/components/Proctoring'

function TestSessionInner() {
  const router = useRouter()
  const params = useSearchParams()
  const skill = params.get('skill') || ''
  const level = (params.get('level') || 'easy') as QuestionLevel

  const { skillProgress, updateSkillProgress } = useAppStore()

  const [phase, setPhase] = useState<'camera' | 'loading' | 'test' | 'followup' | 'result'>('camera')
  const [followupQuestion, setFollowupQuestion] = useState('')
  const [followupConcept, setFollowupConcept] = useState('')
  const [followupAnswer, setFollowupAnswer] = useState('')
  const [followupScore, setFollowupScore] = useState<number | null>(null)
  const [followupFeedback, setFollowupFeedback] = useState('')
  const [followupLoading, setFollowupLoading] = useState(false)
  const [followupSkipped, setFollowupSkipped] = useState(false)
  const sessionIdRef = useRef<string | null>(null)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [current, setCurrent] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_LIMITS[level])
  const [warnings, setWarnings] = useState(0)
  const [latestWarningMsg, setLatestWarningMsg] = useState('')
  const [autoSubmitReason, setAutoSubmitReason] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [weakConcepts, setWeakConcepts] = useState<string[]>([])
  const [loadingMsg, setLoadingMsg] = useState('Generating questions...')
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0)
  const cooldownTimeLeftRef = useRef(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const detectionRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Guard: if this skill/level was attempted very recently, don't let the
  // user start a new attempt (also enforced on the /test list page, but this
  // covers direct navigation / refreshes on this URL too).
  useEffect(() => {
    const sp = skillProgress.find((s) => s.skill === skill)
    const alreadyCompleted = sp?.[`${level}Completed` as keyof SkillProgress] as boolean | undefined
    if (alreadyCompleted) return // re-verification of an expired badge is always allowed
    if (!sp?.lastAttempt) return
    const elapsedMs = Date.now() - new Date(sp.lastAttempt).getTime()
    const remainingMs = RETEST_COOLDOWN_MINUTES * 60 * 1000 - elapsedMs
    if (remainingMs > 0) {
      router.replace('/test')
    }
  }, [skill, level, skillProgress, router])

  // Tab visibility detection
  useEffect(() => {
    if (phase !== 'test') return
    const handleVisibility = () => {
      if (document.hidden && !submitted) {
        handleAutoSubmit('Tab switch detected')
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [phase, submitted])

  // Timer
  useEffect(() => {
    if (phase !== 'test' || submitted) return
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          handleAutoSubmit('Time expired')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, submitted])

  // Safety cooldown countdown timer after heartbreak
  useEffect(() => {
    if (cooldownTimeLeft <= 0) return
    const timer = setInterval(() => {
      setCooldownTimeLeft((c) => {
        const next = c - 1
        cooldownTimeLeftRef.current = next
        return next
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownTimeLeft])

  const handleAutoSubmit = useCallback((reason: string) => {
    if (submitted) return
    setAutoSubmitReason(reason)
    if (timerRef.current) clearInterval(timerRef.current)
    if (detectionRef.current) clearInterval(detectionRef.current)
    doSubmit(reason)
  }, [submitted])

  const handleWarning = useCallback((msg: string) => {
    if (cooldownTimeLeftRef.current > 0) {
      setLatestWarningMsg(`${msg} (Grace Period)`)
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current)
      warningTimeoutRef.current = setTimeout(() => {
        setLatestWarningMsg('')
      }, 4000)
      return
    }

    setLatestWarningMsg(msg)
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current)
    warningTimeoutRef.current = setTimeout(() => {
      setLatestWarningMsg('')
    }, 4000)

    setWarnings((prev) => {
      const newWarnings = prev + 1
      if (newWarnings >= 3) {
        handleAutoSubmit('Proctoring rules violated: ' + msg)
      } else {
        setCooldownTimeLeft(120)
        cooldownTimeLeftRef.current = 120
      }
      return newWarnings
    })
  }, [handleAutoSubmit])

  const doSubmit = useCallback((reason?: string) => {
    setSubmitted(true)
    if (timerRef.current) clearInterval(timerRef.current)
    const finalAnswers = answers
    let correct = 0
    const weak: string[] = []
    questions.forEach((q, i) => {
      if (finalAnswers[i] === q.correct) correct++
      else weak.push(...(q.concepts || []))
    })
    const sc = questions.length > 0 ? correct / questions.length : 0
    setScore(sc)
    const uniqueWeak = Array.from(new Set(weak))
    setWeakConcepts(uniqueWeak)

    // Update progress
    const passed = sc >= PASS_THRESHOLD
    const nowIso = new Date().toISOString()
    const updates: Record<string, unknown> = {
      [`${level}Score`]: sc,
      weakConcepts: uniqueWeak,
      testsAttempted: (skillProgress.find((s) => s.skill === skill)?.testsAttempted || 0) + 1,
      lastAttempt: nowIso,
    }
    if (passed && !reason) {
      updates[`${level}Completed`] = true
      updates[`${level}VerifiedAt`] = nowIso
    }
    updateSkillProgress(skill, updates as Parameters<typeof updateSkillProgress>[1])

    // Persist
    const saveToDb = async () => {
      try {
        const profile = useAppStore.getState().profile
        if (profile?.id) {
          // 1. Insert into test_sessions (capture id so the optional
          // follow-up round can attach its score to this same row)
          const { data: inserted } = await supabase.from('test_sessions').insert({
            user_id: profile.id,
            skill,
            level,
            score: sc,
            total_questions: questions.length,
            correct_answers: correct,
            passed,
            auto_submitted: !!reason,
            auto_submit_reason: reason || null,
            weak_concepts: uniqueWeak,
            time_taken_sec: TIME_LIMITS[level] - timeLeft,
          }).select('id').single()
          if (inserted?.id) sessionIdRef.current = inserted.id

          // 2. Update skill_progress
          const progressUpdates: any = {
            weak_concepts: uniqueWeak,
            tests_attempted: updates.testsAttempted,
            last_attempt: nowIso,
          }
          if (passed && !reason) {
            progressUpdates[`${level}_completed`] = true
            progressUpdates[`${level}_verified_at`] = nowIso
          }
          if (sc !== undefined) {
            progressUpdates[`${level}_score`] = sc
          }
          await supabase.from('skill_progress')
            .update(progressUpdates)
            .eq('user_id', profile.id)
            .eq('skill_name', skill)
        }
      } catch (err) {
        console.error('Failed to save test results to DB:', err)
      }
    }
    saveToDb()

    // Optional bonus round: if the test wasn't auto-submitted and the
    // learner got at least one question wrong, offer one AI-graded
    // "explain it in your own words" follow-up before showing the result.
    // This never changes the pass/fail outcome above — it's purely extra
    // signal for the learner's own feedback.
    if (!reason && uniqueWeak.length > 0) {
      setFollowupConcept(uniqueWeak[0])
      setPhase('followup')
      loadFollowupQuestion(uniqueWeak[0])
    } else {
      setPhase('result')
    }
  }, [answers, questions, level, skill, skillProgress, updateSkillProgress])

  const loadFollowupQuestion = useCallback(async (concept: string) => {
    setFollowupLoading(true)
    try {
      const res = await fetch('/api/generate-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill, level, concept }),
      })
      const data = await res.json()
      setFollowupQuestion(data.question || `In your own words, explain "${concept}" in ${skill}.`)
    } catch {
      setFollowupQuestion(`In your own words, explain "${concept}" in ${skill}.`)
    } finally {
      setFollowupLoading(false)
    }
  }, [skill, level])

  const submitFollowup = useCallback(async () => {
    if (!followupAnswer.trim()) return
    setFollowupLoading(true)
    try {
      const res = await fetch('/api/score-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill, concept: followupConcept, question: followupQuestion, answer: followupAnswer }),
      })
      const data = await res.json()
      setFollowupScore(typeof data.score === 'number' ? data.score : null)
      setFollowupFeedback(data.feedback || '')

      if (sessionIdRef.current) {
        await supabase.from('test_sessions').update({
          followup_question: followupQuestion,
          followup_answer: followupAnswer,
          followup_score: data.score ?? null,
          followup_feedback: data.feedback ?? null,
        }).eq('id', sessionIdRef.current)
      }
    } catch (err) {
      console.error('Failed to score follow-up answer:', err)
    } finally {
      setFollowupLoading(false)
    }
  }, [followupAnswer, followupConcept, followupQuestion, skill])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setCameraStream(stream)
      if (videoRef.current) videoRef.current.srcObject = stream
      loadQuestions()
    } catch {
      setCameraError(true)
    }
  }

  const loadQuestions = async () => {
    setPhase('loading')
    setLoadingMsg('Connecting to AI engine...')
    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill, level }),
      })
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`)
      }
      const data = await res.json()
      if (data.error || !data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error(data?.error || 'Invalid questions response')
      }
      setLoadingMsg('Randomizing questions...')
      await new Promise((r) => setTimeout(r, 500))
      setQuestions(data.questions)
      setAnswers(new Array(data.questions.length).fill(null))
      setPhase('test')
    } catch (err) {
      console.error('Failed to generate questions via API:', err)
      setLoadingMsg('Using cached questions...')
      await new Promise((r) => setTimeout(r, 500))
      // Mock fallback
      const mocks: Question[] = Array.from({ length: 10 }, (_, i) => ({
        id: `q${i}`,
        skill,
        level,
        question: `Sample ${level} question ${i + 1} about ${skill}?`,
        options: ['Answer A (correct)', 'Answer B', 'Answer C', 'Answer D'],
        correct: 0,
        explanation: 'This demonstrates the correct concept.',
        concepts: [`${skill} concept ${i + 1}`],
      }))
      setQuestions(mocks)
      setAnswers(new Array(10).fill(null))
      setPhase('test')
    }
  }

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const timePercent = (timeLeft / TIME_LIMITS[level]) * 100
  const timeColor = timePercent > 50 ? 'var(--teal)' : timePercent > 20 ? 'var(--gold)' : 'var(--err)'

  // Bind stream to video element when it mounts
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream
    }
  }, [phase, cameraStream])

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop())
    }
  }, [cameraStream])

  if (phase === 'camera') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--ink)' }}>
        <div className="w-full max-w-md rounded-3xl p-8 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="text-5xl mb-4">📷</div>
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--gold)' }}>
            Camera Required
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--muted2)' }}>
            Enable your camera to begin the test. You will receive 3 warnings for movement before auto-submission.
          </p>
          <div className="rounded-2xl overflow-hidden mb-6" style={{ background: 'var(--surface)', height: 200 }}>
            {cameraStream ? (
              <video ref={videoRef} autoPlay muted playsInline width={640} height={480} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--muted)' }}>
                {cameraError ? '❌ Camera denied' : '◎ Awaiting camera...'}
              </div>
            )}
          </div>
          {cameraError ? (
            <p className="text-sm" style={{ color: 'var(--err)' }}>Camera access denied. Please allow camera in browser settings and refresh.</p>
          ) : (
            <button
              onClick={startCamera}
              className="w-full py-3 rounded-xl font-semibold text-sm"
              style={{ background: 'var(--gold)', color: 'var(--ink)' }}
            >
              Enable Camera & Start Test
            </button>
          )}
          <button onClick={() => router.push('/test')} className="mt-3 text-xs" style={{ color: 'var(--muted2)' }}>
            ← Back to Tests
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ink)' }}>
        <div className="text-center">
          <div className="spin-ring w-12 h-12 rounded-full mx-auto mb-4" style={{ border: '3px solid var(--border)', borderTopColor: 'var(--gold)' }} />
          <p style={{ color: 'var(--muted2)' }}>{loadingMsg}</p>
        </div>
      </div>
    )
  }

  if (phase === 'followup') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--ink)' }}>
        <div className="w-full max-w-lg rounded-3xl p-8" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-xs mb-2 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal)' }}>Bonus round — optional</p>
          <h2 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--gold)' }}>Explain it in your own words</h2>
          <p className="text-xs mb-5" style={{ color: 'var(--muted2)' }}>This doesn't affect your {level} result — it's extra feedback on: <b>{followupConcept}</b></p>

          {followupScore === null ? (
            <>
              <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--surface)' }}>
                {followupLoading && !followupQuestion ? (
                  <p className="text-sm" style={{ color: 'var(--muted2)' }}>Generating your follow-up question…</p>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--text)' }}>{followupQuestion}</p>
                )}
              </div>
              <textarea
                value={followupAnswer}
                onChange={(e) => setFollowupAnswer(e.target.value)}
                rows={5}
                placeholder="Type your explanation here..."
                className="w-full p-3 rounded-xl text-sm mb-4"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setFollowupSkipped(true); setPhase('result') }}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm"
                  style={{ background: 'var(--surface)', color: 'var(--muted2)', border: '1px solid var(--border)' }}
                >
                  Skip
                </button>
                <button
                  onClick={submitFollowup}
                  disabled={followupLoading || !followupAnswer.trim()}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm"
                  style={{ background: 'var(--gold)', color: 'var(--ink)', opacity: followupLoading || !followupAnswer.trim() ? 0.6 : 1 }}
                >
                  {followupLoading ? 'Scoring…' : 'Submit'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl p-4 mb-4 text-center" style={{ background: 'var(--surface)' }}>
                <p className="text-3xl font-bold mb-1" style={{ color: 'var(--teal)' }}>{Math.round(followupScore * 100)}%</p>
                <p className="text-sm" style={{ color: 'var(--muted2)' }}>{followupFeedback}</p>
              </div>
              <button
                onClick={() => setPhase('result')}
                className="w-full py-3 rounded-xl font-semibold text-sm"
                style={{ background: 'var(--gold)', color: 'var(--ink)' }}
              >
                Continue to results →
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  if (phase === 'result') {
    const passed = score >= PASS_THRESHOLD && !autoSubmitReason
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--ink)' }}>
        <div className="w-full max-w-lg rounded-3xl p-8" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {autoSubmitReason && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(255,107,129,0.1)', color: 'var(--err)', border: '1px solid rgba(255,107,129,0.2)' }}>
              ⚠️ Auto-submitted: {autoSubmitReason}
            </div>
          )}
          <div className="text-center mb-6">
            <div className="text-6xl mb-3">{passed ? '🏆' : '📖'}</div>
            <h2 className="text-3xl font-bold mb-1" style={{ fontFamily: 'var(--font-playfair)', color: passed ? 'var(--gold)' : 'var(--err)' }}>
              {Math.round(score * 100)}%
            </h2>
            <p className="text-sm font-semibold" style={{ color: passed ? 'var(--teal)' : 'var(--err)' }}>
              {passed ? `${level.toUpperCase()} LEVEL CLEARED!` : 'Keep practicing'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted2)' }}>
              {skill} — {level} level
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl p-4 text-center" style={{ background: 'var(--surface)' }}>
              <p className="text-2xl font-bold" style={{ color: 'var(--gold)' }}>{Math.round(score * questions.length)}/{questions.length}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted2)' }}>Correct</p>
            </div>
            <div className="rounded-xl p-4 text-center" style={{ background: 'var(--surface)' }}>
              <p className="text-2xl font-bold" style={{ color: passed ? 'var(--teal)' : 'var(--err)' }}>{passed ? '✓ PASS' : '✗ FAIL'}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted2)' }}>Result (≥60%)</p>
            </div>
          </div>
          {weakConcepts.length > 0 && (
            <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(255,107,129,0.05)', border: '1px solid rgba(255,107,129,0.15)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--err)', fontFamily: 'var(--font-mono)' }}>CONCEPTS TO REVIEW:</p>
              <div className="flex flex-wrap gap-2">
                {weakConcepts.map((c) => (
                  <span key={c} className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(255,107,129,0.1)', color: 'var(--err)' }}>{c}</span>
                ))}
              </div>
            </div>
          )}
          {passed && (
            <button
              onClick={() => {
                const username = useAppStore.getState().profile?.username
                if (username) window.open(`/badge/${encodeURIComponent(username)}`, '_blank')
              }}
              className="w-full mb-3 py-2.5 rounded-xl font-semibold text-sm"
              style={{ background: 'rgba(232,201,122,0.08)', color: 'var(--gold)', border: '1px solid var(--gold-md)' }}
            >
              🏅 Share this badge
            </button>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/test')}
              className="flex-1 py-3 rounded-xl font-semibold text-sm"
              style={{ background: 'var(--gold)', color: 'var(--ink)' }}
            >
              Back to Tests
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 py-3 rounded-xl font-semibold text-sm"
              style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Test phase
  const q = questions[current]
  if (!q) return null

  return (
    <div className="min-h-screen" style={{ background: 'var(--ink)' }}>
      <Proctoring 
        videoElement={cameraStream ? videoRef.current : null} 
        onWarning={handleWarning}
        active={phase === 'test'} 
      />
      {/* Header bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3" style={{ background: 'var(--deep)', borderBottom: '1px solid var(--border)' }}>
        <div>
          <span className="text-xs font-semibold" style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>{skill}</span>
          <span className="text-xs ml-2 px-2 py-0.5 rounded-full capitalize" style={{ background: `rgba(79,209,197,0.1)`, color: 'var(--teal)' }}>{level}</span>
        </div>
        <div className="flex items-center gap-4 relative">
          {latestWarningMsg && (
            <div className="absolute right-0 top-12 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg whitespace-nowrap animate-in fade-in slide-in-from-top-2 z-50">
              <span className="text-xs font-bold" style={{ color: 'var(--err)' }}>⚠️ {latestWarningMsg}</span>
            </div>
          )}
          {cooldownTimeLeft > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold animate-pulse"
                 style={{ 
                   background: 'rgba(79, 209, 197, 0.1)', 
                   borderColor: 'rgba(79, 209, 197, 0.3)',
                   color: 'var(--teal)' 
                 }}>
              <span className="w-2 h-2 rounded-full animate-ping" style={{ background: 'var(--teal)' }}></span>
              <span>Grace Period: {formatTime(cooldownTimeLeft)}</span>
            </div>
          )}
          <div className="flex gap-1 text-base bg-black/20 px-2 py-1 rounded-full border border-white/5">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className="transition-all duration-300" style={{ opacity: i < 3 - warnings ? 1 : 0.5, transform: i < 3 - warnings ? 'scale(1)' : 'scale(0.9)' }}>
                {i < 3 - warnings ? '❤️' : '💔'}
              </span>
            ))}
          </div>
          <div className="text-lg font-bold tabular-nums" style={{ fontFamily: 'var(--font-mono)', color: timeColor }}>
            {formatTime(timeLeft)}
          </div>
        </div>
        <div className="text-xs" style={{ color: 'var(--muted2)' }}>{current + 1} / {questions.length}</div>
      </div>

      {/* Progress bar */}
      <div className="h-1" style={{ background: 'var(--surface)' }}>
        <div className="h-full transition-all duration-300" style={{ width: `${((current) / questions.length) * 100}%`, background: 'var(--gold)' }} />
      </div>

      <div className="flex max-w-4xl mx-auto">
        {/* Main question area */}
        <div className="flex-1 p-6">
          <div className="rounded-2xl p-6 mb-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <p className="text-xs mb-3 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>Question {current + 1}</p>
            <p className="text-lg font-medium leading-relaxed" style={{ color: 'var(--text)' }}>{q.question}</p>
          </div>

          <div className="space-y-3">
            {q.options.map((opt, i) => {
              const selected = answers[current] === i
              return (
                <button
                  key={i}
                  onClick={() => {
                    const newAnswers = [...answers]
                    newAnswers[current] = i
                    setAnswers(newAnswers)
                  }}
                  className="w-full text-left px-5 py-4 rounded-xl text-sm font-medium transition-all duration-150"
                  style={{
                    background: selected ? 'var(--gold-lo)' : 'var(--card)',
                    border: `1px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
                    color: selected ? 'var(--gold)' : 'var(--text)',
                  }}
                >
                  <span className="font-mono mr-3 text-xs" style={{ color: 'var(--muted)' }}>{String.fromCharCode(65 + i)}.</span>
                  {opt}
                </button>
              )
            })}
          </div>

          <div className="flex gap-3 mt-6">
            {current > 0 && (
              <button
                onClick={() => setCurrent((c) => c - 1)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
              >
                ← Prev
              </button>
            )}
            {current < questions.length - 1 ? (
              <button
                onClick={() => setCurrent((c) => c + 1)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--gold)', color: 'var(--ink)' }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={() => doSubmit()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--gold)', color: 'var(--ink)' }}
              >
                Submit Test ✓
              </button>
            )}
          </div>
        </div>

        {/* Camera sidebar */}
        <div className="w-48 p-4 hidden md:block">
          <div className="sticky top-20">
            <div className="rounded-xl overflow-hidden mb-2" style={{ background: 'var(--surface)', aspectRatio: '4/3' }}>
              <video ref={videoRef} autoPlay muted playsInline width={640} height={480} className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
            </div>
            <p className="text-[10px] text-center" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>PROCTORING ACTIVE</p>

            {/* Question nav */}
            <div className="mt-4 grid grid-cols-5 gap-1">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className="w-7 h-7 rounded-lg text-[10px] font-bold"
                  style={{
                    background: i === current ? 'var(--gold)' : answers[i] !== null ? 'rgba(79,209,197,0.2)' : 'var(--surface)',
                    color: i === current ? 'var(--ink)' : answers[i] !== null ? 'var(--teal)' : 'var(--muted)',
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <button
                onClick={() => doSubmit()}
                className="w-full py-2 rounded-xl text-xs font-semibold"
                style={{ background: 'var(--surface)', color: 'var(--err)', border: '1px solid rgba(255,107,129,0.2)' }}
              >
                Submit Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TestSessionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ink)', color: 'var(--text)' }}>Loading...</div>}>
      <TestSessionInner />
    </Suspense>
  )
}
