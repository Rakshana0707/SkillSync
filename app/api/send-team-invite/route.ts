import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { inviteeName, inviteeEmail, inviterName, teamName, problemStatement } = await req.json()

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey || resendKey === 'your-resend-api-key-here') {
    // If Resend is not configured, just skip silently — invite is still saved in DB
    return NextResponse.json({ ok: true, skipped: true })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const emailBody = {
    from: 'SkillSync <noreply@skillsync.app>',
    to: [inviteeEmail],
    subject: `${inviterName} invited you to join "${teamName}" on SkillSync`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; background: #08090f; color: #e2e2e2; padding: 32px; border-radius: 16px; max-width: 520px; margin: auto;">
        <h2 style="color: #e8c97a; font-size: 22px; margin-bottom: 8px;">🏆 Hackathon Team Invite</h2>
        <p style="color: #a0a0b8; font-size: 14px; margin-bottom: 24px;">You've been invited to join a hackathon team on SkillSync.</p>

        <div style="background: #12131e; border: 1px solid #2a2b3d; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em;">Team</p>
          <p style="margin: 0 0 16px; font-size: 18px; font-weight: 700; color: #e8c97a;">${teamName}</p>
          <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em;">Problem Statement</p>
          <p style="margin: 0; font-size: 14px; color: #c5c5d5; line-height: 1.6;">${problemStatement}</p>
        </div>

        <p style="font-size: 14px; color: #a0a0b8; margin-bottom: 24px;">
          <strong style="color: #e2e2e2;">${inviterName}</strong> wants you on their team. 
          Log in to SkillSync and visit the <strong style="color: #4fd1c5;">Hackathon → Requests</strong> tab to accept or decline.
        </p>

        <a href="${siteUrl}/hackathon"
           style="display: inline-block; background: #e8c97a; color: #08090f; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; text-decoration: none;">
          View Request →
        </a>

        <p style="margin-top: 32px; font-size: 12px; color: #4a4b5e;">
          You received this because someone on SkillSync added your email to their hackathon team.
        </p>
      </div>
    `,
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailBody),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      return NextResponse.json({ ok: false, error: err }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Failed to send email:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
