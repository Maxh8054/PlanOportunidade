import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const users = [
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

async function seed() {
  console.log('Seeding users...\n');

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        password: hashedPassword,
        role: user.role,
        loginAttempts: 0,
        lockedUntil: null,
        sessionToken: null,
      },
      create: {
        name: user.name,
        email: user.email,
        password: hashedPassword,
        role: user.role,
      },
    });
    console.log(`  ✓ ${user.email} (${user.role}) — senha: ${user.password}`);
  }

  console.log('\nDone! Users created/updated.');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
