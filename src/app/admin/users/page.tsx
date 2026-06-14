import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/app')

  const { data: users } = await supabase
    .from('profiles')
    .select('*, subscriptions(status, ends_at, plan:plans(name))')
    .order('created_at', { ascending: false })

  function getStatus(u: any) {
    const now = new Date()
    const activeSub = u.subscriptions?.find((s: any) => s.status === 'active' && new Date(s.ends_at) > now)
    if (activeSub) return { label: 'Active', color: 'text-green-600' }
    if (u.trial_ends_at && new Date(u.trial_ends_at) > now) return { label: 'Trial', color: 'text-blue-600' }
    return { label: 'Inactive', color: 'text-gray-400' }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900">← Admin</Link>
          <h1 className="text-xl font-bold text-gray-900">Users</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Trial Ends</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users?.map((u: any) => {
                const status = getStatus(u)
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{u.full_name || '—'}</p>
                      <p className="text-gray-500">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${status.color}`}>{status.label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {u.trial_ends_at ? new Date(u.trial_ends_at).toLocaleDateString('en-PH') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(u.created_at).toLocaleDateString('en-PH')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
