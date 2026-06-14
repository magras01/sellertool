'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plan } from '@/types'

export default function PlanManager({ plans }: { plans: Plan[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [days, setDays] = useState('')
  const [loading, setLoading] = useState(false)

  function openCreate() {
    setEditing(null)
    setName(''); setDescription(''); setPrice(''); setDays('')
    setShowForm(true)
  }

  function openEdit(plan: Plan) {
    setEditing(plan)
    setName(plan.name); setDescription(plan.description || ''); setPrice(String(plan.price)); setDays(String(plan.duration_days))
    setShowForm(true)
  }

  async function handleSave() {
    setLoading(true)
    await fetch('/api/admin/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editing?.id, name, description, price: parseFloat(price), duration_days: parseInt(days) }),
    })
    setLoading(false)
    setShowForm(false)
    router.refresh()
  }

  async function toggleActive(plan: Plan) {
    await fetch('/api/admin/plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: plan.id, is_active: !plan.is_active }),
    })
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
        + New Plan
      </button>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">{editing ? 'Edit Plan' : 'New Plan'}</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₱)</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
              <input type="number" value={days} onChange={e => setDays(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={loading} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {plans.map(plan => (
          <div key={plan.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{plan.name}</p>
                {!plan.is_active && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>}
              </div>
              <p className="text-sm text-gray-500">₱{plan.price.toFixed(2)} / {plan.duration_days} days</p>
              {plan.description && <p className="text-xs text-gray-400 mt-0.5">{plan.description}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(plan)} className="text-sm text-blue-600 hover:underline">Edit</button>
              <button onClick={() => toggleActive(plan)} className="text-sm text-gray-500 hover:underline">
                {plan.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
