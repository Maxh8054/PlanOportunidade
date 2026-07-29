import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Default passwords (used only if SEED_PASSWORDS env var is not set)
// On production, always set SEED_PASSWORDS environment variable for security
const DEFAULT_USERS = [
  { name: 'Marlon Mendes Silva', email: 'marlon-m@zaminebrasil.com', password: 'Zamine@2026!', role: 'admin' },
  { name: 'Max Henrique Araujo Rufino', email: 'max-r@zaminebrasil.com', password: 'MaxR@2026!', role: 'admin' },
  { name: 'Julio Cesar Sanches', email: 'julio-s@zaminebrasil.com', password: 'JulioS@2026!', role: 'user' },
  { name: 'Jun Shibuya', email: 'jun-shibuya@zaminebrasil.com', password: 'JunShi@2026!', role: 'user' },
  { name: 'Yuji Furukawa', email: 'yuji-furukawa@zaminebrasil.com', password: 'YujiFu@2026!', role: 'user' },
  { name: 'Wallysson Diego Santiago Santos', email: 'wallysson-s@zaminebrasil.com', password: 'Wallys@2026!', role: 'user' },
  { name: 'Wagner Maciel Cunha', email: 'wagner-m@zaminebrasil.com', password: 'Wagner@2026!', role: 'user' },
  { name: 'Fabricio Cezar de Almeida', email: 'fabricio-c@zaminebrasil.com', password: 'Fabricio@2026!', role: 'user' },
  { name: 'Alvino Alberto Junior', email: 'alvino-j@zaminebrasil.com', password: 'Alvino@2026!', role: 'user' },
  { name: 'Fernando Quintão Pena', email: 'fernando-p@zaminebrasil.com', password: 'Fernando@2026!', role: 'user' },
  { name: 'Ranielly Miranda De Souza', email: 'ranielly-s@zaminebrasil.com', password: 'Ranielly@2026!', role: 'user' },
  { name: 'Rodrigo Valentino Victor', email: 'rodrigo-v@zaminebrasil.com', password: 'Rodrigo@2026!', role: 'user' },
  { name: 'Victor Carvalho de Almeida', email: 'victor-a@zaminebrasil.com', password: 'Victor@2026!', role: 'user' },
  { name: 'Visitante', email: 'visitante@zaminebrasil.com', password: 'Visit@2026!', role: 'user' },
];

function generateRandomPassword(length = 10): string {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

function getPassword(email: string): string {
  const envPasswords = process.env.SEED_PASSWORDS;
  if (envPasswords) {
    try {
      const map = JSON.parse(envPasswords);
      if (map[email] && typeof map[email] === 'string') return map[email];
    } catch { /* ignore parse error */ }
  }
  // Fallback to default (local dev only)
  const fallback = DEFAULT_USERS.find(u => u.email === email);
  return fallback?.password || generateRandomPassword();
}

async function seed() {
  console.log('Seeding users...\n');

  if (!process.env.SEED_PASSWORDS) {
    console.log('⚠️  SEED_PASSWORDS env var not set — using default passwords (local dev only)\n');
  }

  for (const user of DEFAULT_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: user.email } });

    if (existing) {
      // User already exists — ONLY update non-sensitive fields (role, reset lockouts)
      // NEVER overwrite password (admin may have approved a password change)
      await prisma.user.update({
        where: { email: user.email },
        data: {
          role: user.role,
          name: user.name,
          // Reset lockout state only (password stays untouched)
          lockedUntil: null,
          loginAttempts: 0,
        },
      });
      console.log(`  ↻ ${user.email} — existing user, password preserved (${user.role})`);
    } else {
      // New user — create with seed password
      const password = getPassword(user.email);
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
          password: hashedPassword,
          role: user.role,
        },
      });
      console.log(`  ✓ ${user.email} — new user created (${user.role})`);
    }
  }

  console.log('\nDone! Users created/updated. Existing passwords were preserved.');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
