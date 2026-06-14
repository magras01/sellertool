import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const adminEmail = process.env.ADMIN_EMAIL!
const appName = 'SellerTools'
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function sendPaymentReceivedEmail(data: {
  userName: string
  userEmail: string
  planName: string
  amount: number
  referenceNumber: string | null
  paymentId: string
}) {
  await resend.emails.send({
    from: `${appName} <noreply@${process.env.EMAIL_DOMAIN || 'resend.dev'}>`,
    to: adminEmail,
    subject: `New Payment Submission - ${data.userName}`,
    html: `
      <h2>New GCash Payment Submitted</h2>
      <p><strong>User:</strong> ${data.userName} (${data.userEmail})</p>
      <p><strong>Plan:</strong> ${data.planName}</p>
      <p><strong>Amount:</strong> ₱${data.amount.toFixed(2)}</p>
      <p><strong>Reference #:</strong> ${data.referenceNumber || 'Not provided'}</p>
      <p><a href="${appUrl}/admin/payments/${data.paymentId}">Review Payment →</a></p>
    `,
  })
}

export async function sendPaymentConfirmedEmail(data: {
  userName: string
  userEmail: string
  planName: string
  endsAt: string
}) {
  await resend.emails.send({
    from: `${appName} <noreply@${process.env.EMAIL_DOMAIN || 'resend.dev'}>`,
    to: data.userEmail,
    subject: `Payment Confirmed - Welcome to ${appName}!`,
    html: `
      <h2>Your payment has been confirmed!</h2>
      <p>Hi ${data.userName},</p>
      <p>Your subscription to the <strong>${data.planName}</strong> plan is now active.</p>
      <p><strong>Access until:</strong> ${new Date(data.endsAt).toLocaleDateString('en-PH', { dateStyle: 'long' })}</p>
      <p><a href="${appUrl}/app">Go to SellerTools →</a></p>
    `,
  })
}

export async function sendPaymentRejectedEmail(data: {
  userName: string
  userEmail: string
  planName: string
  reason: string | null
}) {
  await resend.emails.send({
    from: `${appName} <noreply@${process.env.EMAIL_DOMAIN || 'resend.dev'}>`,
    to: data.userEmail,
    subject: `Payment Not Confirmed - Action Required`,
    html: `
      <h2>We could not confirm your payment</h2>
      <p>Hi ${data.userName},</p>
      <p>Unfortunately we were unable to verify your GCash payment for the <strong>${data.planName}</strong> plan.</p>
      ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
      <p>Please submit a new payment or contact us if you believe this is a mistake.</p>
      <p><a href="${appUrl}/subscribe">Try Again →</a></p>
    `,
  })
}

export async function sendTrialExpiryWarningEmail(data: {
  userName: string
  userEmail: string
  trialEndsAt: string
}) {
  await resend.emails.send({
    from: `${appName} <noreply@${process.env.EMAIL_DOMAIN || 'resend.dev'}>`,
    to: data.userEmail,
    subject: `Your free trial expires tomorrow`,
    html: `
      <h2>Your free trial is ending soon</h2>
      <p>Hi ${data.userName},</p>
      <p>Your free trial ends on <strong>${new Date(data.trialEndsAt).toLocaleDateString('en-PH', { dateStyle: 'long' })}</strong>.</p>
      <p>Subscribe now to keep access to all SellerTools features.</p>
      <p><a href="${appUrl}/subscribe">View Plans →</a></p>
    `,
  })
}

export async function sendSubscriptionExpiryWarningEmail(data: {
  userName: string
  userEmail: string
  endsAt: string
}) {
  await resend.emails.send({
    from: `${appName} <noreply@${process.env.EMAIL_DOMAIN || 'resend.dev'}>`,
    to: data.userEmail,
    subject: `Your subscription expires tomorrow`,
    html: `
      <h2>Your subscription is ending soon</h2>
      <p>Hi ${data.userName},</p>
      <p>Your subscription ends on <strong>${new Date(data.endsAt).toLocaleDateString('en-PH', { dateStyle: 'long' })}</strong>.</p>
      <p>Renew now to avoid losing access.</p>
      <p><a href="${appUrl}/subscribe">Renew Subscription →</a></p>
    `,
  })
}
