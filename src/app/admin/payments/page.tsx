import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PaymentActions from '@/components/admin/PaymentActions'

export default async function AdminPaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/app')

  const { data: payments } = await supabase
    .from('payments')
    .select('*, plan:plans(name, duration_days)')
    .order('submitted_at', { ascending: false })

  // Fetch profiles separately to avoid RLS join issue
  const userIds = [...new Set((payments ?? []).map((p: any) => p.user_id))]
  const profilesMap: Record<string, { full_name: string | null; email: string }> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds)
    for (const p of profiles ?? []) profilesMap[p.id] = p
  }

  const statusBadge: Record<string, string> = {
    pending: 'bg-orange-100 text-orange-700',
    confirmed: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900">← Admin</Link>
          <h1 className="text-xl font-bold text-gray-900">Payments</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {!payments?.length ? (
          <p className="text-gray-500">No payments yet.</p>
        ) : (
          <div className="space-y-4">
            {payments.map((p: any) => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{profilesMap[p.user_id]?.full_name || profilesMap[p.user_id]?.email}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[p.status]}`}>
                        {p.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{profilesMap[p.user_id]?.email}</p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{p.plan?.name}</span> — ₱{p.amount.toFixed(2)} for {p.plan?.duration_days} days
                    </p>
                    {p.reference_number && (
                      <p className="text-sm text-gray-500">Ref: {p.reference_number}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      Submitted {new Date(p.submitted_at).toLocaleString('en-PH')}
                    </p>
                    {p.rejection_reason && (
                      <p className="text-sm text-red-600">Rejection reason: {p.rejection_reason}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 items-start sm:items-end">
                    {p.screenshot_url && (
                      <a href={p.screenshot_url} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline">
                        View Screenshot
                      </a>
                    )}
                    {p.status === 'pending' && (
                      <PaymentActions payment={p} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
