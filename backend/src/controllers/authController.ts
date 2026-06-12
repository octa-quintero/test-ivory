import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

import * as authService from '../services/authService';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).optional(),
});

export function login(req: Request, res: Response, next: NextFunction): void {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0]?.message ?? 'Invalid body' });
    return;
  }
  try {
    res.json(authService.login(result.data.email, result.data.password));
  } catch (err) {
    next(err);
  }
}
