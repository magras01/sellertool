import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUserAccess } from '@/lib/access'
import { Profile, Subscription, Payment } from '@/types'
import Link from 'next/link'
import PricingCalculator from '@/components/PricingCalculator'
import AccessBanner from '@/components/AccessBanner'

export default async function AppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, subscriptionRes, pendingPaymentRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('subscriptions').select('*, plan:plans(*)').eq('user_id', user.id).eq('status', 'active').maybeSingle(),
    supabase.from('payments').select('*').eq('user_id', user.id).eq('status', 'pending').maybeSingle(),
  ])

  const profile = profileRes.data as Profile | null
  const subscription = subscriptionRes.data as Subscription | null
  const pendingPayment = pendingPaymentRes.data as Payment | null

  const access = getUserAccess(profile, subscription, pendingPayment)

  async function handleLogout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">SellerTools</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{profile?.full_name || user.email}</span>
            {!access.hasAccess && (
              <Link href="/subscribe" className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Subscribe
              </Link>
            )}
            <form action={handleLogout}>
              <button type="submit" className="text-sm text-gray-500 hover:text-gray-700">Log out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <AccessBanner access={access} />

        {access.hasAccess ? (
          <PricingCalculator />
        ) : (
          <div className="mt-8 bg-white rounded-xl border border-gray-200 p-12 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Required</h2>
            <p className="text-gray-500 mb-6">
              {access.status === 'pending'
                ? 'Your payment is being reviewed. You will be notified once confirmed.'
                : 'Subscribe to access the pricing calculator and all tools.'}
            </p>
            {access.status !== 'pending' && (
              <Link href="/subscribe" className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                View Plans
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
