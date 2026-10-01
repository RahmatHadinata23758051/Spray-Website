export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  role: 'operator' | 'analyst' | 'admin';
  isActive: boolean;
};

export interface AuthRepository {
  findUserByEmail(email: string): Promise<AuthUser | undefined>;
  createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findUserBySessionTokenHash(tokenHash: string): Promise<AuthUser | undefined>;
  deleteSession(tokenHash: string): Promise<void>;
}
