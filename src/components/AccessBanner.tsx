import { UserAccess } from '@/types'
import Link from 'next/link'

export default function AccessBanner({ access }: { access: UserAccess }) {
  if (access.status === 'active') return null

  const configs = {
    trial: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      message: `Free trial active — expires ${new Date(access.trialEndsAt!).toLocaleDateString('en-PH', { dateStyle: 'medium' })}`,
      cta: { label: 'Subscribe', href: '/subscribe' },
    },
    trial_expired: {
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-800',
      message: 'Your free trial has ended.',
      cta: { label: 'Subscribe Now', href: '/subscribe' },
    },
    pending: {
      bg: 'bg-orange-50 border-orange-200',
      text: 'text-orange-800',
      message: 'Your payment is under review. Access will be granted once confirmed.',
      cta: null,
    },
    expired: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      message: 'Your subscription has expired.',
      cta: { label: 'Renew', href: '/subscribe' },
    },
    none: {
      bg: 'bg-gray-50 border-gray-200',
      text: 'text-gray-800',
      message: 'No active subscription.',
      cta: { label: 'Subscribe', href: '/subscribe' },
    },
  }

  const config = configs[access.status as keyof typeof configs]
  if (!config) return null

  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-lg border ${config.bg} mb-6`}>
      <p className={`text-sm ${config.text}`}>{config.message}</p>
      {config.cta && (
        <Link href={config.cta.href} className="ml-4 text-sm font-medium text-blue-600 hover:underline whitespace-nowrap">
          {config.cta.label}
        </Link>
      )}
    </div>
  )
}
