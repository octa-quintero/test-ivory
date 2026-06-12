import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as commentService from '../services/commentService';

const createCommentSchema = z.object({ body: z.string() });

export function getComments(
  req: Request<{ postId: string }, unknown, unknown, { limit?: string; cursor?: string }>,
  res: Response,
  next: NextFunction,
): void {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const result = commentService.getComments(req.params.postId, limit, req.query.cursor);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function deleteComment(
  req: Request<{ postId: string; commentId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await commentService.deleteComment(
      req.params.postId,
      req.params.commentId,
      req.userId as string,
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export function updateComment(
  req: Request<{ postId: string; commentId: string }>,
  res: Response,
  next: NextFunction,
): void {
  const result = createCommentSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'body field is required' });
    return;
  }
  try {
    const data = commentService.updateComment(
      req.params.postId,
      req.params.commentId,
      req.userId as string,
      result.data.body,
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function createComment(
  req: Request<{ postId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const result = createCommentSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'body field is required' });
    return;
  }
  try {
    const data = await commentService.createComment(
      req.params.postId,
      req.userId as string,
      result.data.body,
    );
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}
