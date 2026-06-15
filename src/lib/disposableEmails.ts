// Common disposable / temporary email domains to block at registration.
// Not exhaustive, but covers the most-used throwaway services.
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com', '10minutemail.net', '20minutemail.com', '33mail.com',
  'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.biz',
  'guerrillamailblock.com', 'sharklasers.com', 'grr.la', 'spam4.me',
  'mailinator.com', 'mailinator.net', 'mailinator2.com', 'notmailinator.com',
  'reallymymail.com', 'sogetthis.com', 'mailnesia.com', 'trashmail.com',
  'trashmail.net', 'trashmail.me', 'trash-mail.com', 'kurzepost.de',
  'tempmail.com', 'temp-mail.org', 'temp-mail.io', 'tempmail.net',
  'tempmailo.com', 'tempr.email', 'tempail.com', 'tmpmail.org', 'tmpmail.net',
  'throwawaymail.com', 'throwawayemailaddresses.com', 'getnada.com', 'nada.email',
  'maildrop.cc', 'mailcatch.com', 'mintemail.com', 'mailnull.com',
  'dispostable.com', 'discard.email', 'discardmail.com', 'spamgourmet.com',
  'yopmail.com', 'yopmail.net', 'yopmail.fr', 'cool.fr.nf', 'jetable.fr.nf',
  'fakeinbox.com', 'fakemailgenerator.com', 'emailondeck.com', 'mohmal.com',
  'mytemp.email', 'tempinbox.com', 'minuteinbox.com', 'inboxkitten.com',
  'mailpoof.com', '1secmail.com', '1secmail.net', '1secmail.org',
  'wegwerfmail.de', 'wegwerfmail.net', 'einrot.com', 'fleckens.hu',
  'gustr.com', 'cuvox.de', 'armyspy.com', 'dayrep.com', 'rhyta.com',
  'teleworm.us', 'superrito.com', 'jourrapide.com',
  'hotkev.com', 'hotpalm.com', 'emltmp.com', 'tmpeml.com', 'tmpbox.net',
  'moakt.com', 'moakt.cc', 'moakt.ws', 'tafmail.com', 'clipmail.eu',
  'mailto.plus', 'fexbox.org', 'fexbox.ru', 'rover.info', 'chitthi.in',
  'vipmail.live', 'mailhole.de', 'spambox.us', 'mvrht.net', 'tempmailaddress.com',
  'burnermail.io', 'emailfake.com', 'tmail.com', 'tmails.net', 'tempmail.plus',
])

/**
 * Returns true if the email's domain is a known disposable/temporary email provider.
 */
export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf('@')
  if (at === -1) return false
  const domain = email.slice(at + 1).trim().toLowerCase()
  return DISPOSABLE_DOMAINS.has(domain)
}
