import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', supabase: null }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Forbidden', supabase: null }
  return { error: null, supabase }
}

export async function POST(req: NextRequest) {
  const { error, supabase } = await requireAdmin()
  if (error || !supabase) return NextResponse.json({ error }, { status: 403 })

  const { id, name, description, price, duration_days } = await req.json()

  if (id) {
    await supabase.from('plans').update({ name, description, price, duration_days }).eq('id', id)
  } else {
    await supabase.from('plans').insert({ name, description, price, duration_days })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const { error, supabase } = await requireAdmin()
  if (error || !supabase) return NextResponse.json({ error }, { status: 403 })

  const { id, is_active } = await req.json()
  await supabase.from('plans').update({ is_active }).eq('id', id)

  return NextResponse.json({ success: true })
}
