import type { Request, Response, NextFunction } from 'express';
import * as likeService from '../services/likeService';

export async function addLike(
  req: Request<{ postId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await likeService.addLike(req.params.postId, req.userId as string);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function removeLike(
  req: Request<{ postId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await likeService.removeLike(req.params.postId, req.userId as string);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
