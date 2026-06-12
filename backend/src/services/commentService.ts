import { randomUUID } from 'crypto';
import { store } from '../data/store';
import { AppError } from '../types';
import { invalidateFeedCache } from './feedService';
import type { Comment } from '../types';

const MAX_COMMENT_LENGTH = 500;

const COMMENTS_DEFAULT_LIMIT = 20;
const COMMENTS_MAX_LIMIT = 50;

export interface CommentsResponse {
  comments: Comment[];
  nextCursor: string | null;
}

export function getComments(
  postId: string,
  limit: number = COMMENTS_DEFAULT_LIMIT,
  cursor?: string,
): CommentsResponse {
  const exists = store.posts.some((p) => p.id === postId);
  if (!exists) throw new AppError(404, 'Post not found');

  const safeLimit = Math.min(limit, COMMENTS_MAX_LIMIT);
  const all = store.comments.filter((c) => c.postId === postId);

  const startIdx = cursor ? all.findIndex((c) => c.id === cursor) + 1 : 0;
  const page = all.slice(startIdx, startIdx + safeLimit);
  const nextCursor =
    page.length === safeLimit && startIdx + safeLimit < all.length
      ? page[page.length - 1].id
      : null;

  return { comments: page, nextCursor };
}

export async function deleteComment(
  postId: string,
  commentId: string,
  requesterId: string,
): Promise<{ commentsCount: number }> {
  const post = store.posts.find((p) => p.id === postId);
  if (!post) throw new AppError(404, 'Post not found');

  const idx = store.comments.findIndex((c) => c.id === commentId && c.postId === postId);
  if (idx === -1) throw new AppError(404, 'Comment not found');

  if (store.comments[idx].authorId !== requesterId) {
    throw new AppError(403, "Cannot delete another user's comment");
  }

  store.comments.splice(idx, 1);
  post.commentsCount = Math.max(0, post.commentsCount - 1);
  await invalidateFeedCache();

  return { commentsCount: post.commentsCount };
}

export function updateComment(
  postId: string,
  commentId: string,
  requesterId: string,
  body: string,
): { comment: Comment } {
  const post = store.posts.find((p) => p.id === postId);
  if (!post) throw new AppError(404, 'Post not found');

  const comment = store.comments.find((c) => c.id === commentId && c.postId === postId);
  if (!comment) throw new AppError(404, 'Comment not found');

  if (comment.authorId !== requesterId) {
    throw new AppError(403, "Cannot edit another user's comment");
  }

  const trimmed = body.trim();
  if (!trimmed) throw new AppError(400, 'Comment body cannot be empty');
  if (trimmed.length > MAX_COMMENT_LENGTH) {
    throw new AppError(400, `Comment cannot exceed ${MAX_COMMENT_LENGTH} characters`);
  }

  comment.body = trimmed;
  return { comment };
}

export async function createComment(
  postId: string,
  authorId: string,
  body: string,
): Promise<{ comment: Comment; commentsCount: number }> {
  const post = store.posts.find((p) => p.id === postId);
  if (!post) throw new AppError(404, 'Post not found');

  const trimmed = body.trim();
  if (!trimmed) throw new AppError(400, 'Comment body cannot be empty');
  if (trimmed.length > MAX_COMMENT_LENGTH) {
    throw new AppError(400, `Comment cannot exceed ${MAX_COMMENT_LENGTH} characters`);
  }

  const comment: Comment = {
    id: randomUUID(),
    postId,
    authorId,
    body: trimmed,
    createdAt: new Date().toISOString(),
  };

  store.comments.push(comment);
  post.commentsCount += 1;
  await invalidateFeedCache();

  return { comment, commentsCount: post.commentsCount };
}
