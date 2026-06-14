import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PlanManager from '@/components/admin/PlanManager'

export default async function AdminPlansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/app')

  const { data: plans } = await supabase.from('plans').select('*').order('sort_order')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900">← Admin</Link>
          <h1 className="text-xl font-bold text-gray-900">Plans</h1>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <PlanManager plans={plans ?? []} />
      </main>
    </div>
  )
}
