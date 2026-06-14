'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PaymentActions({ payment }: { payment: any }) {
  const router = useRouter()
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAction(action: 'confirm' | 'reject') {
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId: payment.id, action, reason: action === 'reject' ? reason : undefined }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(json.error || 'Something went wrong.')
      return
    }
    router.refresh()
  }

  if (showRejectForm) {
    return (
      <div className="space-y-2 w-full sm:w-64">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason for rejection (optional)"
          rows={2}
          className="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <div className="flex gap-2">
          <button
            onClick={() => handleAction('reject')}
            disabled={loading}
            className="flex-1 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Rejecting...' : 'Confirm Reject'}
          </button>
          <button
            onClick={() => setShowRejectForm(false)}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => handleAction('confirm')}
          disabled={loading}
          className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? '...' : 'Confirm'}
        </button>
        <button
          onClick={() => setShowRejectForm(true)}
          disabled={loading}
          className="px-4 py-1.5 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  )
}
