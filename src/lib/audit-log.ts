import { db } from '@/lib/db';

type AuditAction =
  | 'login_success'
  | 'login_failed'
  | 'login_blocked'
  | 'password_request'
  | 'password_approved'
  | 'password_rejected'
  | 'user_unlocked'
  | 'user_locked'
  | 'logout'
  | 'password_request_expired'
  | 'passwords_exported'
  | 'brute_force_blocked';

interface AuditParams {
  action: AuditAction;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  ip?: string | null;
  details?: string;
}

// Fire-and-forget audit logging (non-blocking)
export function auditLog(params: AuditParams): void {
  db.auditLog
    .create({
      data: {
        action: params.action,
        userId: params.userId ?? null,
        userEmail: params.userEmail ?? null,
        userName: params.userName ?? null,
        ip: params.ip ?? null,
        details: params.details ?? null,
      },
    })
    .catch((err) => {
      console.error('Audit log write failed:', err);
    });
}
