import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  sendTrialExpiryWarningEmail,
  sendSubscriptionExpiryWarningEmail,
} from '@/lib/email'

export async function GET(req: NextRequest) {
  // Protect with a secret header
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStart = new Date(tomorrow)
  tomorrowStart.setHours(0, 0, 0, 0)
  const tomorrowEnd = new Date(tomorrow)
  tomorrowEnd.setHours(23, 59, 59, 999)

  // Trial expiry warnings
  const { data: trialUsers } = await supabase
    .from('profiles')
    .select('id, full_name, email, trial_ends_at')
    .gte('trial_ends_at', tomorrowStart.toISOString())
    .lte('trial_ends_at', tomorrowEnd.toISOString())

  for (const u of trialUsers ?? []) {
    // Skip if already sent today
    const { data: existing } = await supabase
      .from('email_logs')
      .select('id')
      .eq('user_id', u.id)
      .eq('type', 'trial_expiry_warning')
      .gte('sent_at', tomorrowStart.toISOString())
      .maybeSingle()

    if (existing) continue

    try {
      await sendTrialExpiryWarningEmail({
        userName: u.full_name || u.email,
        userEmail: u.email,
        trialEndsAt: u.trial_ends_at,
      })
      await supabase.from('email_logs').insert({ user_id: u.id, type: 'trial_expiry_warning' })
    } catch {}
  }

  // Subscription expiry warnings
  const { data: expiringSubs } = await supabase
    .from('subscriptions')
    .select('id, user_id, ends_at, profile:profiles(full_name, email)')
    .eq('status', 'active')
    .gte('ends_at', tomorrowStart.toISOString())
    .lte('ends_at', tomorrowEnd.toISOString())

  for (const sub of expiringSubs ?? []) {
    const profile = (sub as any).profile
    const { data: existing } = await supabase
      .from('email_logs')
      .select('id')
      .eq('user_id', sub.user_id)
      .eq('type', 'subscription_expiry_warning')
      .gte('sent_at', tomorrowStart.toISOString())
      .maybeSingle()

    if (existing) continue

    try {
      await sendSubscriptionExpiryWarningEmail({
        userName: profile?.full_name || profile?.email,
        userEmail: profile?.email,
        endsAt: sub.ends_at,
      })
      await supabase.from('email_logs').insert({ user_id: sub.user_id, type: 'subscription_expiry_warning' })
    } catch {}
  }

  return NextResponse.json({ success: true })
}
