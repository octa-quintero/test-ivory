import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';
import { logger } from '../config/winston.config';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  logger.error(err instanceof Error ? err : String(err));
  res.status(500).json({ error: 'Internal server error' });
}
