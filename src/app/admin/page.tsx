import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/app')

  const [pendingRes, usersRes, plansRes] = await Promise.all([
    supabase.from('payments').select('id').eq('status', 'pending'),
    supabase.from('profiles').select('id'),
    supabase.from('plans').select('id').eq('is_active', true),
  ])

  const stats = [
    { label: 'Pending Payments', value: pendingRes.data?.length ?? 0, href: '/admin/payments', urgent: (pendingRes.data?.length ?? 0) > 0 },
    { label: 'Total Users', value: usersRes.data?.length ?? 0, href: '/admin/users', urgent: false },
    { label: 'Active Plans', value: plansRes.data?.length ?? 0, href: '/admin/plans', urgent: false },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">SellerTools Admin</h1>
          <Link href="/app" className="text-sm text-gray-600 hover:text-gray-900">View App</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {stats.map(stat => (
            <Link key={stat.label} href={stat.href} className={`bg-white rounded-xl border p-6 hover:shadow-sm transition-shadow ${stat.urgent ? 'border-orange-300' : 'border-gray-200'}`}>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className={`text-3xl font-bold mt-1 ${stat.urgent ? 'text-orange-600' : 'text-gray-900'}`}>{stat.value}</p>
              {stat.urgent && <p className="text-xs text-orange-500 mt-1">Needs review</p>}
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Manage Payments', desc: 'Confirm or reject GCash payments', href: '/admin/payments' },
            { label: 'Manage Users', desc: 'View all users and their subscription status', href: '/admin/users' },
            { label: 'Manage Plans', desc: 'Create and edit subscription plans', href: '/admin/plans' },
            { label: 'Settings', desc: 'Trial days, GCash details', href: '/admin/settings' },
          ].map(item => (
            <Link key={item.label} href={item.href} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
              <p className="font-semibold text-gray-900">{item.label}</p>
              <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
