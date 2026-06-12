import { store } from '../data/store';
import { AppError } from '../types';
import { invalidateFeedCache } from './feedService';

const likeKey = (userId: string, postId: string): string => `${userId}:${postId}`;

export async function addLike(postId: string, userId: string): Promise<void> {
  const post = store.posts.find((p) => p.id === postId);
  if (!post) throw new AppError(404, 'Post not found');

  const key = likeKey(userId, postId);
  if (!store.likes.has(key)) {
    store.likes.add(key);
    post.likesCount += 1;
    await invalidateFeedCache();
  }
  // Idempotent: second call with same user+post is a no-op
}

export async function removeLike(postId: string, userId: string): Promise<void> {
  const post = store.posts.find((p) => p.id === postId);
  if (!post) throw new AppError(404, 'Post not found');

  const key = likeKey(userId, postId);
  if (store.likes.has(key)) {
    store.likes.delete(key);
    post.likesCount -= 1;
    await invalidateFeedCache();
  }
  // Idempotent: second call when already unliked is a no-op
}
