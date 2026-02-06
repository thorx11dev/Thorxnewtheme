import { promises as dns } from 'dns';

// Disposable email domains list (50+ domains) - same as client-side
export const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
  '10minutemail.com', 'temp-mail.org', 'fakeinbox.com', 'trashmail.com',
  'yopmail.com', 'maildrop.cc', 'getnada.com', 'tempr.email',
  'throwawaymail.com', 'sharklasers.com', 'guerrillamail.info', 'grr.la',
  'spam4.me', 'mintemail.com', 'emailondeck.com', 'tempinbox.com',
  'dispostable.com', 'anonbox.net', 'mohmal.com', 'mytemp.email',
  'emailfake.com', 'temp-link.net', 'jetable.org', 'getairmail.com',
  'inboxbear.com', 'spamgourmet.com', 'mailnesia.com', 'tempsky.com',
  'guerrillamailblock.com', 'guerrillamail.de', 'guerrillamail.net', 'guerrillamail.org',
  'guerrillamail.biz', 'spam4.me', 'grr.la', 'guerrillamail.com',
  'trbvm.com', 'anonymbox.com', 'binkmail.com', 'trashmail.net',
  'trashmail.me', 'trashmail.io', 'throwam.com', 'caseedu.tk',
  'spambox.us', 'tmail.com', 'tmailinator.com', 'trillianpro.com',
  'vomoto.com', 'bobmail.info', 'chammy.info', 'devnullmail.com',
  'letthemeatspam.com', 'mailinater.com', 'mailinator2.com', 'sogetthis.com',
  'thisisnotmyrealemail.com', 'suremail.info', 'spamhereplease.com'
];

// Common email typos for popular domains
export const EMAIL_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmil.com': 'hotmail.com',
  'gmai.co': 'gmail.com',
  'gmailc.om': 'gmail.com'
};

// Pakistani mobile operator prefixes (all major operators)
export const PAKISTANI_OPERATOR_PREFIXES = [
  // Jazz (Mobilink)
  '300', '301', '302', '303', '304', '305', '306', '307', '308', '309',
  // Telenor
  '340', '341', '342', '343', '344', '345', '346', '347', '348', '349',
  // Zong
  '310', '311', '312', '313', '314', '315', '316', '317', '318', '319',
  // Ufone
  '330', '331', '332', '333', '334', '335', '336', '337',
  // SCO/SCOM
  '355',
  // Warid (now part of Jazz)
  '320', '321', '322', '323', '324', '325',
  // Instaphone/Telenor
  '370'
];

// MX record verification using Node.js dns module
export async function verifyEmailDomainMX(domain: string): Promise<boolean> {
  try {
    const mxRecords = await dns.resolveMx(domain);
    return mxRecords && mxRecords.length > 0;
  } catch (error) {
    console.error(`MX lookup failed for domain ${domain}:`, error);
    return false;
  }
}

// Server-side email validation with comprehensive checks
export async function validateEmailServer(email: string): Promise<{ valid: boolean; message: string }> {
  if (!email || !email.trim()) {
    return { valid: false, message: "Email is required" };
  }

  const trimmedEmail = email.trim().toLowerCase();

  // RFC 5322 format check
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, message: "Invalid email" };
  }

  const domain = trimmedEmail.split('@')[1];

  if (!domain) {
    return { valid: false, message: "Invalid email" };
  }

  // Check for common email typos
  if (EMAIL_TYPOS[domain]) {
    return {
      valid: false,
      message: `Invalid email domain. Did you mean ${EMAIL_TYPOS[domain]}?`
    };
  }

  // Check against disposable email domains
  if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
    return { valid: false, message: "Temporary email addresses are not allowed" };
  }

  // Pattern matching for common disposable email formats
  if (domain.includes('temp') || domain.includes('disposable') ||
    domain.includes('trash') || domain.includes('throwaway') ||
    domain.includes('fake') || domain.includes('guerrilla')) {
    return { valid: false, message: "Temporary email addresses are not allowed" };
  }

  // Check for role-based addresses
  const localPart = trimmedEmail.split('@')[0];
  const roleBasedPrefixes = ['admin', 'noreply', 'no-reply', 'support', 'info', 'sales', 'marketing', 'webmaster', 'postmaster'];
  if (roleBasedPrefixes.includes(localPart)) {
    return { valid: false, message: "Role-based email addresses are not allowed" };
  }

  // Valid TLD check
  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2) {
    return { valid: false, message: "Invalid email" };
  }

  // MX record verification (Disabled to prevent registration blocking)
  /*
  try {
    const hasMxRecords = await verifyEmailDomainMX(domain);
    if (!hasMxRecords) {
      console.warn(`Email domain ${domain} does not have valid MX records, but proceeding anyway.`);
    }
  } catch (error) {
    console.error(`MX verification skipped for ${domain} due to error:`, error);
  }
  */

  return { valid: true, message: "" };
}

// Server-side phone validation with Pakistani operator prefix checks
export function validatePhoneServer(phone: string): { valid: boolean; message: string } {
  // If phone is empty or undefined, it's valid (optional field)
  if (!phone || phone.trim() === '') {
    return { valid: true, message: "" };
  }

  const cleanPhone = phone.replace(/[\s\-()]/g, '');

  // Check Pakistani mobile number format
  const pkMobileRegex = /^(\+92|92|0)?3(\d{2})(\d{7})$/;
  const match = cleanPhone.match(pkMobileRegex);

  if (match) {
    // Build the full 3-digit operator prefix (3 + the next 2 digits)
    const operatorPrefix = '3' + match[2];

    // Validate operator prefix
    if (!PAKISTANI_OPERATOR_PREFIXES.includes(operatorPrefix)) {
      return {
        valid: false,
        message: "This mobile number prefix is not recognized"
      };
    }

    return { valid: true, message: "" };
  }

  // If doesn't match Pakistani format, provide helpful error
  return {
    valid: false,
    message: "Invalid phone"
  };
}

// Normalize Pakistani phone number to consistent format
export function normalizePhoneNumber(phone: string): string {
  if (!phone || phone.trim() === '') {
    return '';
  }

  const cleanPhone = phone.replace(/[\s\-()]/g, '');

  // Convert to +92 format
  if (cleanPhone.startsWith('0')) {
    return `+92${cleanPhone.substring(1)}`;
  } else if (cleanPhone.startsWith('92')) {
    return `+${cleanPhone}`;
  } else if (cleanPhone.startsWith('+92')) {
    return cleanPhone;
  }

  return phone;
}
