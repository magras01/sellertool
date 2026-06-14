import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPaymentConfirmedEmail, sendPaymentRejectedEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (adminProfile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { paymentId, action, reason } = await req.json()

  if (!paymentId || !['confirm', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { data: payment } = await supabase
    .from('payments')
    .select('*, plan:plans(*)')
    .eq('id', paymentId)
    .single()

  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

  const { data: userProfile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', payment.user_id)
    .single()

  if (action === 'confirm') {
    const endsAt = new Date()
    endsAt.setDate(endsAt.getDate() + payment.plan.duration_days)

    // Cancel any existing active subscription
    await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', payment.user_id)
      .eq('status', 'active')

    // Create new subscription
    await supabase.from('subscriptions').insert({
      user_id: payment.user_id,
      plan_id: payment.plan_id,
      status: 'active',
      started_at: new Date().toISOString(),
      ends_at: endsAt.toISOString(),
    })

    // Update payment status
    await supabase
      .from('payments')
      .update({ status: 'confirmed', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
      .eq('id', paymentId)

    // Log email
    await supabase.from('email_logs').insert({
      user_id: payment.user_id,
      type: 'payment_confirmed',
      metadata: { payment_id: paymentId },
    })

    try {
      await sendPaymentConfirmedEmail({
        userName: userProfile?.full_name || userProfile?.email || '',
        userEmail: userProfile?.email || '',
        planName: payment.plan.name,
        endsAt: endsAt.toISOString(),
      })
    } catch {}

  } else {
    await supabase
      .from('payments')
      .update({
        status: 'rejected',
        rejection_reason: reason || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', paymentId)

    await supabase.from('email_logs').insert({
      user_id: payment.user_id,
      type: 'payment_rejected',
      metadata: { payment_id: paymentId, reason },
    })

    try {
      await sendPaymentRejectedEmail({
        userName: userProfile?.full_name || userProfile?.email || '',
        userEmail: userProfile?.email || '',
        planName: payment.plan.name,
        reason: reason || null,
      })
    } catch {}
  }

  return NextResponse.json({ success: true })
}
