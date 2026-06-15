import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isDisposableEmail } from '@/lib/disposableEmails'

export async function POST(req: NextRequest) {
  const { email, password, fullName } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }

  // Block disposable / temporary email providers
  if (isDisposableEmail(email)) {
    return NextResponse.json(
      { error: 'Please use a permanent email address. Temporary emails are not allowed.' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
