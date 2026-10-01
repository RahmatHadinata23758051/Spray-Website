import { z } from 'zod';

export const LoginRequestSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginRequestDTO = z.infer<typeof LoginRequestSchema>;

export const UserResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: z.enum(['admin', 'operator']),
  name: z.string(),
});

export type UserResponseDTO = z.infer<typeof UserResponseSchema>;
