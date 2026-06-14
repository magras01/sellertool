'use client'

import { useState } from 'react'

interface Props {
  settings: Record<string, string>
}

export default function SettingsForm({ settings }: Props) {
  const [trialDays, setTrialDays] = useState(settings.trial_days ?? '3')
  const [trialEnabled, setTrialEnabled] = useState(settings.trial_enabled === 'true')
  const [gcashName, setGcashName] = useState(settings.gcash_name ?? '')
  const [gcashNumber, setGcashNumber] = useState(settings.gcash_number ?? '')
  const [gcashQrUrl, setGcashQrUrl] = useState(settings.gcash_qr_url ?? '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trial_days: trialDays,
        trial_enabled: String(trialEnabled),
        gcash_name: gcashName,
        gcash_number: gcashNumber,
        gcash_qr_url: gcashQrUrl,
      }),
    })

    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Trial Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Free Trial</h2>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="trialEnabled"
            checked={trialEnabled}
            onChange={e => setTrialEnabled(e.target.checked)}
            className="w-4 h-4 text-blue-600"
          />
          <label htmlFor="trialEnabled" className="text-sm text-gray-700">Enable free trial for new signups</label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Trial Duration (days)</label>
          <input
            type="number"
            min="1"
            max="365"
            value={trialDays}
            onChange={e => setTrialDays(e.target.value)}
            disabled={!trialEnabled}
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-gray-400">Only affects new signups after saving.</p>
        </div>
      </div>

      {/* GCash Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">GCash Details</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
          <input value={gcashName} onChange={e => setGcashName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GCash Number</label>
          <input value={gcashNumber} onChange={e => setGcashNumber(e.target.value)} placeholder="09XXXXXXXXX" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">QR Code Image URL</label>
          <input value={gcashQrUrl} onChange={e => setGcashQrUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <p className="mt-1 text-xs text-gray-400">Upload your QR image somewhere (e.g. Supabase Storage) and paste the URL here.</p>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
      </button>
    </form>
  )
}
