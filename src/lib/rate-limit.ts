// In-memory rate limiter (persists per Node.js process lifetime)
const store = new Map<string, { count: number; resetTime: number }>();

// Track failed login IPs across different accounts (brute-force global detection)
const failedLoginByIp = new Map<string, { attempts: number; resetTime: number; emails: Set<string> }>();

// Cleanup stale entries every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store) {
    if (now >= record.resetTime) store.delete(key);
  }
  for (const [key, record] of failedLoginByIp) {
    if (now >= record.resetTime) failedLoginByIp.delete(key);
  }
}, 10 * 60 * 1000);

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const record = store.get(key);

  // No record or window expired — fresh start
  if (!record || now >= record.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }

  // Over limit
  if (record.count >= maxRequests) {
    return { success: false, remaining: 0, resetTime: record.resetTime };
  }

  // Under limit — increment
  record.count++;
  return { success: true, remaining: maxRequests - record.count, resetTime: record.resetTime };
}

// ── Global brute-force detection ──────────────────────────────────
// If an IP fails login for 5+ DIFFERENT accounts in 15 minutes, block it

const BRUTE_FORCE_MAX_ACCOUNTS = 5;
const BRUTE_FORCE_WINDOW = 15 * 60 * 1000;

export function trackFailedLogin(ip: string, email: string): { blocked: boolean; resetTime: number } {
  const now = Date.now();
  const record = failedLoginByIp.get(ip);

  if (!record || now >= record.resetTime) {
    failedLoginByIp.set(ip, { attempts: 1, resetTime: now + BRUTE_FORCE_WINDOW, emails: new Set([email]) });
    return { blocked: false, resetTime: now + BRUTE_FORCE_WINDOW };
  }

  record.emails.add(email);
  record.attempts = record.emails.size;

  if (record.emails.size >= BRUTE_FORCE_MAX_ACCOUNTS) {
    return { blocked: true, resetTime: record.resetTime };
  }

  return { blocked: false, resetTime: record.resetTime };
}

export function isIpBlockedForBruteForce(ip: string): boolean {
  const record = failedLoginByIp.get(ip);
  if (!record) return false;
  if (Date.now() >= record.resetTime) {
    failedLoginByIp.delete(ip);
    return false;
  }
  return record.emails.size >= BRUTE_FORCE_MAX_ACCOUNTS;
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// ── Reset rate limit for a specific key ──────────────────────────
// Used when admin approves a password change — resets the user's rate limit
export function resetRateLimit(key: string): void {
  store.delete(key);
}
