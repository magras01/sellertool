'use client'

import { useState } from 'react'
import { Plan } from '@/types'
import Image from 'next/image'

interface Props {
  plans: Plan[]
  settings: Record<string, string>
  userId: string
}

export default function SubscribeForm({ plans, settings, userId }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(plans[0] ?? null)
  const [refNumber, setRefNumber] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  function copyNumber() {
    if (!settings.gcash_number) return
    navigator.clipboard.writeText(settings.gcash_number)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPlan) return
    if (!screenshot) {
      setError('Please upload a screenshot of your GCash receipt.')
      return
    }
    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('planId', selectedPlan.id)
    formData.append('amount', String(selectedPlan.price))
    formData.append('referenceNumber', refNumber)
    if (screenshot) formData.append('screenshot', screenshot)

    const res = await fetch('/api/payments', { method: 'POST', body: formData })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error || 'Something went wrong.')
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="text-4xl mb-3">✓</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Payment Submitted!</h3>
        <p className="text-gray-500">We will review your payment and activate your account. Check your email for confirmation.</p>
        <a href="/app" className="mt-6 inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          Back to App
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Plan selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Select a Plan</h3>
        <div className="space-y-3">
          {plans.map(plan => (
            <label
              key={plan.id}
              className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                selectedPlan?.id === plan.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="plan"
                  value={plan.id}
                  checked={selectedPlan?.id === plan.id}
                  onChange={() => setSelectedPlan(plan)}
                  className="text-blue-600"
                />
                <div>
                  <p className="font-medium text-gray-900">{plan.name}</p>
                  {plan.description && <p className="text-sm text-gray-500">{plan.description}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">₱{plan.price.toFixed(2)}</p>
                <p className="text-xs text-gray-500">{plan.duration_days} days</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* GCash instructions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Pay via GCash</h3>
        <div className="flex flex-col items-center gap-5">
          {settings.gcash_qr_url && (
            <Image
              src={settings.gcash_qr_url}
              alt="GCash QR Code"
              width={260}
              height={260}
              className="rounded-lg border border-gray-200"
            />
          )}
          <div className="w-full space-y-2 text-sm text-gray-700">
            <p>1. Open your GCash app</p>
            <p>2. Scan the QR code or send to:</p>
            {settings.gcash_name && <p className="font-semibold pl-4">Name: {settings.gcash_name}</p>}
            {settings.gcash_number && (
              <div className="flex items-center gap-2 pl-4">
                <span className="font-semibold">Number: {settings.gcash_number}</span>
                <button
                  type="button"
                  onClick={copyNumber}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${copied ? 'bg-green-50 border-green-300 text-green-700' : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'}`}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            )}
            {selectedPlan && <p className="font-semibold pl-4">Amount: ₱{selectedPlan.price.toFixed(2)}</p>}
            <p>3. Take a screenshot of the receipt</p>
            <p>4. Fill out the form below and upload the screenshot</p>
          </div>
        </div>
      </div>

      {/* Submit form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Submit Payment Proof</h3>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GCash Reference Number</label>
            <input
              type="text"
              value={refNumber}
              onChange={e => setRefNumber(e.target.value)}
              placeholder="e.g. 1234567890"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Screenshot of Receipt <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept="image/*"
              required
              onChange={e => setScreenshot(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !selectedPlan}
            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Payment'}
          </button>
        </form>
      </div>
    </div>
  )
}
