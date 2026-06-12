import type { Request, Response, NextFunction } from 'express';
import * as postService from '../services/postService';

export function getPost(req: Request<{ postId: string }>, res: Response, next: NextFunction): void {
  try {
    const post = postService.getPost(req.params.postId);
    res.json({ post });
  } catch (err) {
    next(err);
  }
}

export async function createPost(
  req: Request<Record<string, never>, unknown, { body?: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const post = await postService.createPost(req.body.body ?? '', req.userId!);
    res.status(201).json({ post });
  } catch (err) {
    next(err);
  }
}

export function getAllPosts(_req: Request, res: Response, next: NextFunction): void {
  try {
    const posts = postService.getAllPosts();
    res.json({ posts });
  } catch (err) {
    next(err);
  }
}

export async function updatePost(
  req: Request<{ postId: string }, unknown, { body?: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const post = await postService.updatePost(req.params.postId, req.body.body ?? '');
    res.json({ post });
  } catch (err) {
    next(err);
  }
}

export async function deletePost(
  req: Request<{ postId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await postService.deletePost(req.params.postId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function updateMyPost(
  req: Request<{ postId: string }, unknown, { body?: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const post = await postService.updateOwnPost(
      req.params.postId,
      req.body.body ?? '',
      req.userId!,
    );
    res.json({ post });
  } catch (err) {
    next(err);
  }
}

export async function deleteMyPost(
  req: Request<{ postId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await postService.deleteOwnPost(req.params.postId, req.userId!);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
