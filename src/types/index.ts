export type UserRole = 'user' | 'admin'

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled'

export type PaymentStatus = 'pending' | 'confirmed' | 'rejected'

export type EmailType =
  | 'payment_received'
  | 'payment_confirmed'
  | 'payment_rejected'
  | 'trial_expiry_warning'
  | 'subscription_expiry_warning'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  trial_started_at: string | null
  trial_ends_at: string | null
  created_at: string
  updated_at: string
}

export interface Plan {
  id: string
  name: string
  description: string | null
  price: number
  duration_days: number
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  plan_id: string
  status: SubscriptionStatus
  started_at: string
  ends_at: string
  created_at: string
  updated_at: string
  plan?: Plan
}

export interface Payment {
  id: string
  user_id: string
  plan_id: string
  amount: number
  reference_number: string | null
  screenshot_url: string | null
  status: PaymentStatus
  rejection_reason: string | null
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  created_at: string
  updated_at: string
  plan?: Plan
  profile?: Profile
}

export interface AdminSetting {
  key: string
  value: string
  description: string | null
  updated_at: string
  updated_by: string | null
}

export type AccessStatus = 'trial' | 'trial_expired' | 'pending' | 'active' | 'expired' | 'none'

export interface UserAccess {
  status: AccessStatus
  hasAccess: boolean
  trialEndsAt?: string
  subscriptionEndsAt?: string
}
