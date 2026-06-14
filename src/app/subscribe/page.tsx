import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Plan } from '@/types'
import SubscribeForm from '@/components/SubscribeForm'

export default async function SubscribePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [plansRes, settingsRes] = await Promise.all([
    supabase.from('plans').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('admin_settings').select('key, value').in('key', ['gcash_name', 'gcash_number', 'gcash_qr_url']),
  ])

  const plans = (plansRes.data ?? []) as Plan[]
  const settings = Object.fromEntries((settingsRes.data ?? []).map(s => [s.key, s.value]))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">SellerTools</h1>
          <a href="/app" className="text-sm text-gray-600 hover:text-gray-900">← Back to app</a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Subscribe</h2>
        <p className="text-gray-500 mb-8">Pay via GCash and we will activate your account within a few hours.</p>

        <SubscribeForm plans={plans} settings={settings} userId={user.id} />
      </main>
    </div>
  )
}
