import { and, eq, gt } from 'drizzle-orm';
import type { db as database } from '../client';
import { sessions, users } from '../schema';
import type { AuthRepository, AuthUser } from '../../../application/ports/authRepository';

export class PostgresAuthRepository implements AuthRepository {
  constructor(private db: typeof database) {}

  async findUserByEmail(email: string): Promise<AuthUser | undefined> {
    const row = await this.db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    return row[0];
  }

  async createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.db.insert(sessions).values({ userId, tokenHash, expiresAt });
  }

  async findUserBySessionTokenHash(tokenHash: string): Promise<AuthUser | undefined> {
    const rows = await this.db
      .select({ user: users })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          gt(sessions.expiresAt, new Date()),
          eq(users.isActive, true)
        )
      )
      .limit(1);
    
    return rows[0]?.user;
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }
}
