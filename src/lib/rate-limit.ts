// In-memory rate limiter (persists per Node.js process lifetime)
const store = new Map<string, { count: number; resetTime: number }>();

// Cleanup stale entries every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store) {
    if (now >= record.resetTime) store.delete(key);
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

export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
