import { db } from '../server/src/db';
import { users } from './schema';
import argon2 from 'argon2';
import { eq } from 'drizzle-orm';

const adminEmail = 'admin@local.test';
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'change-me-local-only';

const existing = await db.select().from(users).where(eq(users.email, adminEmail));

if (existing.length === 0) {
  const passwordHash = await argon2.hash(adminPassword);
  await db.insert(users).values({
    email: adminEmail,
    displayName: 'Local Admin',
    passwordHash,
    role: 'admin',
    isActive: true,
  });
  console.log(`Seeded admin: ${adminEmail}`);
} else {
  console.log(`Admin already exists: ${adminEmail}`);
}

process.exit(0);
