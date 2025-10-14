import { z } from 'zod';

export const signUpSchema = z.object({
  firstName: z.string().min(1, 'firstName wajib'),
  lastName: z.string().optional(),
  email: z.string().email('email tidak valid'),
  username: z.string().min(3).max(100).optional(),
  password: z.string().min(6, 'password minimal 6 karakter'),
  confirmPassword: z.string().min(6)
}).refine(d => d.password === d.confirmPassword, {
  message: 'password dan confirmPassword tidak sama',
  path: ['confirmPassword']
});

export const signInSchema = z.object({
  identifier: z.string().min(1, 'email/username wajib'),
  password: z.string().min(1, 'password wajib')
});

export const employeeSignInSchema = z.object({
  companyUser: z.string().min(1),
  employeeId: z.string().min(1),
  password: z.string().min(1)
});

export const googleTokenSchema = z.object({
  id_token: z.string().min(1, 'Token Google wajib diisi'),
});
