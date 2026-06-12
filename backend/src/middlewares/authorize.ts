import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';
import type { Role } from '../types';

/**
 * Returns a middleware that restricts access to the specified roles.
 * Must be used after authenticate.
 *
 * Usage: router.delete('/:id', authenticate, authorize('admin'), handler)
 */
export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return next(new AppError(403, 'Insufficient permissions'));
    }
    next();
  };
}
