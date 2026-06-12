import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../types';
import type { Role } from '../types';

interface JwtPayload {
  sub: string;
  role: Role;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError(401, 'Missing or invalid Authorization header'));
  }

  try {
    const payload = jwt.verify(header.slice(7), config.jwt.secret) as JwtPayload;
    req.userId = payload.sub;
    req.userRole = payload.role;
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}
