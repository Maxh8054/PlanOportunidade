import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Default passwords (used only if SEED_PASSWORDS env var is not set)
// On production, always set SEED_PASSWORDS environment variable for security
const DEFAULT_USERS = [
  { name: 'Marlon Mendes Silva', email: 'marlon-m@zaminebrasil.com', password: 'za01', role: 'admin' },
  { name: 'Max Henrique Araujo Rufino', email: 'max-r@zaminebrasil.com', password: 'za02', role: 'admin' },
  { name: 'Julio Cesar Sanches', email: 'julio-s@zaminebrasil.com', password: 'za03', role: 'user' },
  { name: 'Jun Shibuya', email: 'jun-shibuya@zaminebrasil.com', password: 'za04', role: 'user' },
  { name: 'Yuji Furukawa', email: 'yuji-furukawa@zaminebrasil.com', password: 'za05', role: 'user' },
  { name: 'Wallysson Diego Santiago Santos', email: 'wallysson-s@zaminebrasil.com', password: 'za06', role: 'user' },
  { name: 'Wagner Maciel Cunha', email: 'wagner-m@zaminebrasil.com', password: 'za07', role: 'user' },
  { name: 'Fabricio Cezar de Almeida', email: 'fabricio-c@zaminebrasil.com', password: 'za08', role: 'user' },
  { name: 'Alvino Alberto Junior', email: 'alvino-j@zaminebrasil.com', password: 'za09', role: 'user' },
  { name: 'Fernando Quintão Pena', email: 'fernando-p@zaminebrasil.com', password: 'za10', role: 'user' },
  { name: 'Ranielly Miranda De Souza', email: 'ranielly-s@zaminebrasil.com', password: 'za11', role: 'user' },
  { name: 'Rodrigo Valentino Victor', email: 'rodrigo-v@zaminebrasil.com', password: 'za12', role: 'user' },
  { name: 'Victor Carvalho de Almeida', email: 'victor-a@zaminebrasil.com', password: 'za13', role: 'user' },
  { name: 'Visitante', email: 'visitante@zaminebrasil.com', password: 'za00', role: 'user' },
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
    const password = getPassword(user.email);
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        password: hashedPassword,
        role: user.role,
        loginAttempts: 0,
        lockedUntil: null,
        sessionToken: null,
        tokenExpiresAt: null,
      },
      create: {
        name: user.name,
        email: user.email,
        password: hashedPassword,
        role: user.role,
      },
    });
    console.log(`  ✓ ${user.email} (${user.role})`);
  }

  console.log('\nDone! Users created/updated.');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
