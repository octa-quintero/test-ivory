import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as userService from '../services/userService';

const updateMeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
});

export function getMe(req: Request, res: Response, next: NextFunction): void {
  try {
    res.json({ user: userService.getMe(req.userId!) });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  const result = updateMeSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0]?.message ?? 'Invalid body' });
    return;
  }
  try {
    const user = await userService.updateMe(req.userId!, result.data);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function deleteMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await userService.deleteMe(req.userId!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export function getUsers(_req: Request, res: Response): void {
  res.json({ users: userService.getUsers() });
}

export async function deleteUser(
  req: Request<{ userId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await userService.deleteUser(req.params.userId, req.userId!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
