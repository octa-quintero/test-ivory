import type { Request, Response, NextFunction } from 'express';
import * as feedService from '../services/feedService';

interface FeedQuery {
  limit?: string;
  cursor?: string;
}

export async function getFeed(
  req: Request<Record<string, never>, unknown, unknown, FeedQuery>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 20);
    const result = await feedService.getFeed(limit, req.query.cursor, req.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
