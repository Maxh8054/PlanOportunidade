// Password strength validator
// Requirements: minimum 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char

export interface PasswordValidation {
  valid: boolean;
  errors: string[];
  score: number; // 0-5
}

const RULES = [
  {
    test: (pw: string) => pw.length >= 8,
    error: 'Pelo menos 8 caracteres',
  },
  {
    test: (pw: string) => /[A-Z]/.test(pw),
    error: 'Pelo menos 1 letra maiúscula (A-Z)',
  },
  {
    test: (pw: string) => /[a-z]/.test(pw),
    error: 'Pelo menos 1 letra minúscula (a-z)',
  },
  {
    test: (pw: string) => /[0-9]/.test(pw),
    error: 'Pelo menos 1 número (0-9)',
  },
  {
    test: (pw: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pw),
    error: 'Pelo menos 1 caractere especial (!@#$%...)',
  },
];

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];
  let score = 0;

  for (const rule of RULES) {
    if (!rule.test(password)) {
      errors.push(rule.error);
    } else {
      score++;
    }
  }

  // Bonus: longer passwords get extra score
  if (password.length >= 12) score = Math.min(score + 1, 5);

  return {
    valid: errors.length === 0,
    errors,
    score,
  };
}

// Common weak passwords to block
const COMMON_PASSWORDS = new Set([
  'Password1!', 'Passw0rd!', 'Qwerty1!', 'Admin123!', 'Letmein1!',
  'Welcome1!', 'Mysql1!', 'P@ssw0rd', 'P@ssword1', 'Aa123456!',
]);

export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password);
}
