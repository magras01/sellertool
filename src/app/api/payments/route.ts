import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPaymentReceivedEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Block if already has pending payment
  const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'You already have a pending payment under review.' }, { status: 400 })
  }

  const formData = await req.formData()
  const planId = formData.get('planId') as string
  const amount = parseFloat(formData.get('amount') as string)
  const referenceNumber = formData.get('referenceNumber') as string | null
  const screenshotFile = formData.get('screenshot') as File | null

  if (!planId || isNaN(amount)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  let screenshotUrl: string | null = null

  if (screenshotFile && screenshotFile.size > 0) {
    const ext = screenshotFile.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('payment-screenshots')
      .upload(path, screenshotFile, { contentType: screenshotFile.type })

    if (uploadError) {
      return NextResponse.json({ error: 'Failed to upload screenshot. Please try again.' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('payment-screenshots').getPublicUrl(path)
    screenshotUrl = urlData.publicUrl
  }

  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      user_id: user.id,
      plan_id: planId,
      amount,
      reference_number: referenceNumber || null,
      screenshot_url: screenshotUrl,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: 'Failed to submit payment.' }, { status: 500 })

  // Get profile and plan for email
  const [profileRes, planRes] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
    supabase.from('plans').select('name').eq('id', planId).single(),
  ])

  try {
    await sendPaymentReceivedEmail({
      userName: profileRes.data?.full_name || user.email || 'User',
      userEmail: profileRes.data?.email || user.email || '',
      planName: planRes.data?.name || '',
      amount,
      referenceNumber: referenceNumber || null,
      paymentId: payment.id,
    })
  } catch {}

  return NextResponse.json({ success: true })
}
