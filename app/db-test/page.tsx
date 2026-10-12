'use client'

import { useState, useEffect } from 'react'
import { supabase, hashPassword, generateUserId } from '@/lib/supabase'

interface TestResult {
  step: string
  status: 'pending' | 'success' | 'error' | 'skipped'
  message: string
  data?: any
}

export default function DbTestPage() {
  const [results, setResults] = useState<TestResult[]>([])
  const [running, setRunning] = useState(false)
  const [connectionOk, setConnectionOk] = useState<boolean | null>(null)

  // Quick connection check on mount
  useEffect(() => {
    async function checkConnection() {
      try {
        const { error } = await supabase.from('profiles').select('id').limit(1)
        // A permission error (RLS) still means the DB is reachable
        setConnectionOk(!error || error.code === 'PGRST301' || error.code === '42501')
      } catch {
        setConnectionOk(false)
      }
    }
    checkConnection()
  }, [])

  const addResult = (r: TestResult) => setResults(prev => [...prev, r])

  const runFullTest = async () => {
    setRunning(true)
    setResults([])

    const testEmail = `testuser_${Date.now()}@skillsync-demo.com`
    const testPassword = 'TestPass123!@#'
    const testUsername = `test_${Date.now()}`
    const testFullName = 'Demo Test User'
    let userId: string | null = null

    // ─── Step 1: Signup via Custom Auth (Hash Password + Direct Profile Insert) ───
    addResult({ step: '1. Custom Signup (profiles.insert)', status: 'pending', message: 'Creating test profile...' })
    try {
      userId = generateUserId()
      const pwHash = await hashPassword(testPassword)

      const { data, error } = await supabase.from('profiles').insert({
        id: userId,
        full_name: testFullName,
        username: testUsername,
        email: testEmail,
        password_hash: pwHash,
        phone: '+91 12345 67890',
        role: 'student',
        year_of_study: '2nd Year',
      }).select()

      if (error) {
        setResults(prev => prev.map((r, i) =>
          i === prev.length - 1 ? { ...r, status: 'error', message: `Profile creation failed: ${error.message}` } : r
        ))
        setRunning(false)
        return
      }

      setResults(prev => prev.map((r, i) =>
        i === prev.length - 1 ? {
          ...r, status: 'success',
          message: `Profile created directly in table! ID: ${userId?.slice(0, 8)}...`,
          data: data?.[0]
        } : r
      ))
    } catch (err: any) {
      setResults(prev => prev.map((r, i) =>
        i === prev.length - 1 ? { ...r, status: 'error', message: `Unexpected: ${err.message}` } : r
      ))
      setRunning(false)
      return
    }

    if (!userId) {
      addResult({ step: '✗', status: 'error', message: 'No user ID returned — stopping.' })
      setRunning(false)
      return
    }

    // ─── Step 2: Check profile exists in DB ───
    addResult({ step: '2. Verify profile in DB', status: 'pending', message: 'Querying created profile...' })
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        setResults(prev => prev.map((r, i) =>
          i === prev.length - 1 ? {
            ...r, status: 'error',
            message: `Profile query failed: ${error.message} (code: ${error.code}).`
          } : r
        ))
      } else {
        setResults(prev => prev.map((r, i) =>
          i === prev.length - 1 ? {
            ...r, status: 'success',
            message: `Profile verified! Name: ${profile.full_name}, Username: ${profile.username}`,
            data: profile
          } : r
        ))
      }
    } catch (err: any) {
      setResults(prev => prev.map((r, i) =>
        i === prev.length - 1 ? { ...r, status: 'error', message: `Unexpected: ${err.message}` } : r
      ))
    }

    // ─── Step 3: Upsert profile (simulates profile details editing) ───
    addResult({ step: '3. Update/Upsert profile', status: 'pending', message: 'Updating profile data...' })
    try {
      const { data: upserted, error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: testFullName + ' Edited',
          username: testUsername,
          email: testEmail,
          phone: '+91 99999 88888',
          role: 'student',
          year_of_study: '3rd Year',
        })
        .select()

      if (error) {
        setResults(prev => prev.map((r, i) =>
          i === prev.length - 1 ? { ...r, status: 'error', message: `Profile upsert/update failed: ${error.message}` } : r
        ))
      } else {
        setResults(prev => prev.map((r, i) =>
          i === prev.length - 1 ? {
            ...r, status: 'success',
            message: 'Profile updated successfully!',
            data: upserted?.[0]
          } : r
        ))
      }
    } catch (err: any) {
      setResults(prev => prev.map((r, i) =>
        i === prev.length - 1 ? { ...r, status: 'error', message: `Unexpected: ${err.message}` } : r
      ))
    }

    // ─── Step 4: Insert user_skills ───
    addResult({ step: '4. Insert user_skills', status: 'pending', message: 'Inserting demo skills...' })
    try {
      const demoSkills = [
        { user_id: userId, skill_name: 'React', category: 'Frontend' },
        { user_id: userId, skill_name: 'Python', category: 'Backend' },
        { user_id: userId, skill_name: 'TypeScript', category: 'Language' },
      ]

      const { data: skillsData, error } = await supabase
        .from('user_skills')
        .insert(demoSkills)
        .select()

      if (error) {
        setResults(prev => prev.map((r, i) =>
          i === prev.length - 1 ? { ...r, status: 'error', message: `Skills insert failed: ${error.message}` } : r
        ))
      } else {
        setResults(prev => prev.map((r, i) =>
          i === prev.length - 1 ? {
            ...r, status: 'success',
            message: `Inserted ${skillsData?.length || 0} skills: React, Python, TypeScript`,
            data: skillsData
          } : r
        ))
      }
    } catch (err: any) {
      setResults(prev => prev.map((r, i) =>
        i === prev.length - 1 ? { ...r, status: 'error', message: `Unexpected: ${err.message}` } : r
      ))
    }

    // ─── Step 5: Insert user_interests ───
    addResult({ step: '5. Insert user_interests', status: 'pending', message: 'Inserting demo interests...' })
    try {
      const demoInterests = [
        { user_id: userId, interest_name: 'Machine Learning' },
        { user_id: userId, interest_name: 'Web Development' },
      ]

      const { data: interestsData, error } = await supabase
        .from('user_interests')
        .insert(demoInterests)
        .select()

      if (error) {
        setResults(prev => prev.map((r, i) =>
          i === prev.length - 1 ? { ...r, status: 'error', message: `Interests insert failed: ${error.message}` } : r
        ))
      } else {
        setResults(prev => prev.map((r, i) =>
          i === prev.length - 1 ? {
            ...r, status: 'success',
            message: `Inserted ${interestsData?.length || 0} interests: Machine Learning, Web Development`,
            data: interestsData
          } : r
        ))
      }
    } catch (err: any) {
      setResults(prev => prev.map((r, i) =>
        i === prev.length - 1 ? { ...r, status: 'error', message: `Unexpected: ${err.message}` } : r
      ))
    }

    // ─── Step 5.5: Initialize skill_progress ───
    addResult({ step: '5.5. Initialize skill_progress', status: 'pending', message: 'Inserting progress entries...' })
    try {
      const initialProgress = [
        { user_id: userId, skill_name: 'React', easy_completed: false, medium_completed: false, hard_completed: false, weak_concepts: [], tests_attempted: 0 },
        { user_id: userId, skill_name: 'Python', easy_completed: false, medium_completed: false, hard_completed: false, weak_concepts: [], tests_attempted: 0 },
        { user_id: userId, skill_name: 'TypeScript', easy_completed: false, medium_completed: false, hard_completed: false, weak_concepts: [], tests_attempted: 0 }
      ]

      const { data: progressData, error } = await supabase
        .from('skill_progress')
        .insert(initialProgress)
        .select()

      if (error) {
        setResults(prev => prev.map((r, i) =>
          i === prev.length - 1 ? { ...r, status: 'error', message: `Skill progress insert failed: ${error.message}` } : r
        ))
      } else {
        setResults(prev => prev.map((r, i) =>
          i === prev.length - 1 ? {
            ...r, status: 'success',
            message: `Inserted ${progressData?.length || 0} skill progress rows`,
            data: progressData
          } : r
        ))
      }
    } catch (err: any) {
      setResults(prev => prev.map((r, i) =>
        i === prev.length - 1 ? { ...r, status: 'error', message: `Unexpected: ${err.message}` } : r
      ))
    }

    // ─── Step 6: Read back all data ───
    addResult({ step: '6. Read back and verify all data', status: 'pending', message: 'Verifying written tables...' })
    try {
      const [profileRes, skillsRes, interestsRes, progressRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('user_skills').select('*').eq('user_id', userId),
        supabase.from('user_interests').select('*').eq('user_id', userId),
        supabase.from('skill_progress').select('*').eq('user_id', userId),
      ])

      const errors = [
        profileRes.error && `profiles: ${profileRes.error.message}`,
        skillsRes.error && `user_skills: ${skillsRes.error.message}`,
        interestsRes.error && `user_interests: ${interestsRes.error.message}`,
        progressRes.error && `skill_progress: ${progressRes.error.message}`,
      ].filter(Boolean)

      if (errors.length > 0) {
        setResults(prev => prev.map((r, i) =>
          i === prev.length - 1 ? { ...r, status: 'error', message: `Read errors: ${errors.join('; ')}` } : r
        ))
      } else {
        setResults(prev => prev.map((r, i) =>
          i === prev.length - 1 ? {
            ...r, status: 'success',
            message: `All data verified! Profile: ✓, Skills: ${skillsRes.data?.length || 0}, Interests: ${interestsRes.data?.length || 0}, Progress: ${progressRes.data?.length || 0}`,
            data: {
              profile: profileRes.data,
              skills: skillsRes.data,
              interests: interestsRes.data,
              progress: progressRes.data,
            }
          } : r
        ))
      }
    } catch (err: any) {
      setResults(prev => prev.map((r, i) =>
        i === prev.length - 1 ? { ...r, status: 'error', message: `Unexpected: ${err.message}` } : r
      ))
    }

    // ─── Step 7: Test Login with created user ───
    addResult({ step: '7. Custom Login test (query profiles)', status: 'pending', message: 'Testing password match in profiles...' })
    try {
      const pwHash = await hashPassword(testPassword)

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', testEmail)
        .eq('password_hash', pwHash)
        .single()

      if (error || !profile) {
        setResults(prev => prev.map((r, i) =>
          i === prev.length - 1 ? {
            ...r, status: 'error',
            message: `Login query failed or user not found: ${error?.message || 'Invalid credentials'}`
          } : r
        ))
      } else {
        setResults(prev => prev.map((r, i) =>
          i === prev.length - 1 ? {
            ...r, status: 'success',
            message: `Login successful! Retrieved profile ID: ${profile.id}`,
            data: { id: profile.id, email: profile.email, full_name: profile.full_name }
          } : r
        ))
      }
    } catch (err: any) {
      setResults(prev => prev.map((r, i) =>
        i === prev.length - 1 ? { ...r, status: 'error', message: `Unexpected: ${err.message}` } : r
      ))
    }

    // ─── Step 8: Cleanup — delete test data ───
    addResult({ step: '8. Cleanup all test rows', status: 'pending', message: 'Cleaning up test rows...' })
    try {
      // Delete in order (foreign key constraints)
      await supabase.from('skill_progress').delete().eq('user_id', userId)
      await supabase.from('user_interests').delete().eq('user_id', userId)
      await supabase.from('user_skills').delete().eq('user_id', userId)
      await supabase.from('profiles').delete().eq('id', userId)

      setResults(prev => prev.map((r, i) =>
        i === prev.length - 1 ? {
          ...r, status: 'success',
          message: 'All test rows successfully cleaned up from Profiles, User Skills, User Interests, and Skill Progress tables!'
        } : r
      ))
    } catch (err: any) {
      setResults(prev => prev.map((r, i) =>
        i === prev.length - 1 ? { ...r, status: 'error', message: `Cleanup error: ${err.message}` } : r
      ))
    }

    addResult({
      step: '✓ Done',
      status: 'success',
      message: 'All custom database tests completed successfully!'
    })

    setRunning(false)
  }

  const statusIcon = (s: TestResult['status']) => {
    switch (s) {
      case 'pending': return '⏳'
      case 'success': return '✅'
      case 'error': return '❌'
      case 'skipped': return '⏭️'
    }
  }

  const statusColor = (s: TestResult['status']) => {
    switch (s) {
      case 'pending': return '#e8c97a'
      case 'success': return '#4fd1c5'
      case 'error': return '#ff6b81'
      case 'skipped': return '#888'
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#08090f',
      color: '#e8e6e1',
      padding: '40px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(232,201,122,0.08) 0%, rgba(79,209,197,0.05) 100%)',
          border: '1px solid rgba(232,201,122,0.15)',
          borderRadius: 16,
          padding: '28px 32px',
          marginBottom: 28,
        }}>
          <h1 style={{
            fontSize: 28,
            fontWeight: 800,
            margin: '0 0 6px 0',
            background: 'linear-gradient(135deg, #e8c97a, #4fd1c5)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            🔬 SkillSync Database Test
          </h1>
          <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
            Tests signup → profile creation → skills/interests insertion → login → cleanup
          </p>
        </div>

        {/* Connection Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 18px',
          background: connectionOk === null ? 'rgba(232,201,122,0.06)' : connectionOk ? 'rgba(79,209,197,0.06)' : 'rgba(255,107,129,0.06)',
          border: `1px solid ${connectionOk === null ? 'rgba(232,201,122,0.2)' : connectionOk ? 'rgba(79,209,197,0.2)' : 'rgba(255,107,129,0.2)'}`,
          borderRadius: 10,
          marginBottom: 20,
          fontSize: 13,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connectionOk === null ? '#e8c97a' : connectionOk ? '#4fd1c5' : '#ff6b81',
            animation: connectionOk === null ? 'pulse 1.5s infinite' : 'none',
          }} />
          <span style={{ color: connectionOk === null ? '#e8c97a' : connectionOk ? '#4fd1c5' : '#ff6b81' }}>
            {connectionOk === null ? 'Checking Supabase connection...' : connectionOk ? 'Supabase connected ✓' : 'Supabase connection failed ✗'}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#666', fontFamily: 'monospace' }}>
            Publishable Key: ...{(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '').slice(-8)}
          </span>
        </div>

        {/* Run Button */}
        <button
          onClick={runFullTest}
          disabled={running}
          style={{
            width: '100%',
            padding: '14px 24px',
            fontSize: 15,
            fontWeight: 700,
            borderRadius: 10,
            border: 'none',
            cursor: running ? 'wait' : 'pointer',
            background: running ? '#333' : 'linear-gradient(135deg, #e8c97a, #d4a843)',
            color: running ? '#888' : '#08090f',
            transition: 'all 0.3s',
            marginBottom: 24,
          }}
        >
          {running ? '⏳ Running tests...' : '▶ Run Full Database Test'}
        </button>

        {/* Results */}
        {results.length > 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            {results.map((r, i) => (
              <div key={i} style={{
                padding: '14px 18px',
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${statusColor(r.status)}25`,
                borderLeft: `3px solid ${statusColor(r.status)}`,
                borderRadius: 8,
                transition: 'all 0.3s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>{statusIcon(r.status)}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: statusColor(r.status) }}>
                    {r.step}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#aaa', margin: '4px 0 0 26px', lineHeight: 1.5 }}>
                  {r.message}
                </p>
                {r.data && (
                  <details style={{ marginTop: 8, marginLeft: 26 }}>
                    <summary style={{ fontSize: 11, color: '#666', cursor: 'pointer' }}>
                      View response data
                    </summary>
                    <pre style={{
                      fontSize: 10,
                      color: '#4fd1c5',
                      background: 'rgba(0,0,0,0.3)',
                      padding: 12,
                      borderRadius: 6,
                      marginTop: 6,
                      overflow: 'auto',
                      maxHeight: 200,
                    }}>
                      {JSON.stringify(r.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}

            {/* Summary */}
            {!running && results.length > 1 && (
              <div style={{
                padding: '16px 20px',
                background: 'rgba(79,209,197,0.04)',
                border: '1px solid rgba(79,209,197,0.15)',
                borderRadius: 10,
                marginTop: 8,
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#e8e6e1', marginBottom: 6 }}>
                  Summary
                </div>
                <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
                  <span style={{ color: '#4fd1c5' }}>
                    ✅ {results.filter(r => r.status === 'success').length} passed
                  </span>
                  <span style={{ color: '#ff6b81' }}>
                    ❌ {results.filter(r => r.status === 'error').length} failed
                  </span>
                  <span style={{ color: '#888' }}>
                    ⏭️ {results.filter(r => r.status === 'skipped').length} skipped
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div style={{
          marginTop: 28,
          padding: '16px 20px',
          background: 'rgba(232,201,122,0.04)',
          border: '1px dashed rgba(232,201,122,0.15)',
          borderRadius: 10,
          fontSize: 11,
          color: '#777',
          lineHeight: 1.7,
        }}>
          <strong style={{ color: '#e8c97a' }}>ℹ Test Flow:</strong>
          <br />1. Creates a test user via <code style={{ color: '#4fd1c5' }}>supabase.auth.signUp()</code>
          <br />2. Checks if the <code style={{ color: '#4fd1c5' }}>on_auth_user_created</code> trigger auto-created a profile
          <br />3. Upserts profile data (mimics SignupStep2)
          <br />4. Inserts demo skills into <code style={{ color: '#4fd1c5' }}>user_skills</code>
          <br />5. Inserts demo interests into <code style={{ color: '#4fd1c5' }}>user_interests</code>
          <br />6. Reads back all data to verify
          <br />7. Tests login with <code style={{ color: '#4fd1c5' }}>signInWithPassword()</code>
          <br />8. Cleans up test data (except auth.users which requires admin key)
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
