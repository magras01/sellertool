import { Profile, Subscription, Payment, UserAccess, AccessStatus } from '@/types'

export function getUserAccess(
  profile: Profile | null,
  subscription: Subscription | null,
  pendingPayment: Payment | null
): UserAccess {
  if (!profile) return { status: 'none', hasAccess: false }

  const now = new Date()

  // Check active subscription first
  if (subscription && subscription.status === 'active') {
    const endsAt = new Date(subscription.ends_at)
    if (endsAt > now) {
      return { status: 'active', hasAccess: true, subscriptionEndsAt: subscription.ends_at }
    }
  }

  // Check pending payment
  if (pendingPayment) {
    return { status: 'pending', hasAccess: false }
  }

  // Check trial
  if (profile.trial_ends_at) {
    const trialEnd = new Date(profile.trial_ends_at)
    if (trialEnd > now) {
      return { status: 'trial', hasAccess: true, trialEndsAt: profile.trial_ends_at }
    } else {
      return { status: 'trial_expired', hasAccess: false, trialEndsAt: profile.trial_ends_at }
    }
  }

  return { status: 'none', hasAccess: false }
}

export function getAccessLabel(status: AccessStatus): string {
  const labels: Record<AccessStatus, string> = {
    trial: 'Free Trial',
    trial_expired: 'Trial Expired',
    pending: 'Payment Pending',
    active: 'Active',
    expired: 'Expired',
    none: 'No Access',
  }
  return labels[status]
}
