import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/app')

  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  const { data: trialSetting } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'trial_days')
    .single()

  const trialDays = trialSetting?.value ?? '3'

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">SellerTools</h1>
          <div className="flex gap-3">
            <Link href="/login" className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">Log in</Link>
            <Link href="/register" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Start Free Trial</Link>
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Tools Built for Online Sellers</h2>
        <p className="text-lg text-gray-600 mb-8">Calculate your pricing, margins, and profits — fast and accurately.</p>
        <Link href="/register" className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700">
          Try Free for {trialDays} Days
        </Link>
      </section>

      {plans && plans.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pb-20">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-10">Pricing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-xl border border-gray-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900">{plan.name}</h4>
                {plan.description && <p className="text-sm text-gray-500 mt-1">{plan.description}</p>}
                <div className="mt-4">
                  <span className="text-3xl font-bold text-gray-900">₱{plan.price.toFixed(2)}</span>
                  <span className="text-gray-500 ml-1">/ {plan.duration_days} days</span>
                </div>
                <Link href="/register" className="mt-6 block text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
