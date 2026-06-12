import { randomUUID } from 'crypto';
import { store } from '../data/store';
import { AppError } from '../types';
import type { Post } from '../types';
import { invalidateFeedCache } from './feedService';

export function getPost(postId: string): Post {
  const post = store.posts.find((p) => p.id === postId);
  if (!post) throw new AppError(404, 'Post not found');
  return post;
}

const MAX_POST_LENGTH = 500;

export async function createPost(body: string, authorId: string): Promise<Post> {
  const trimmed = body.trim();
  if (!trimmed) throw new AppError(400, 'Post body cannot be empty');
  if (trimmed.length > MAX_POST_LENGTH) {
    throw new AppError(400, `Post body cannot exceed ${MAX_POST_LENGTH} characters`);
  }

  const post: Post = {
    id: `post-${randomUUID()}`,
    authorId,
    body: trimmed,
    createdAt: new Date().toISOString(),
    likesCount: 0,
    commentsCount: 0,
  };

  store.posts.unshift(post);
  await invalidateFeedCache();
  return post;
}

export function getAllPosts(): Post[] {
  return [...store.posts];
}

export async function updatePost(postId: string, body: string): Promise<Post> {
  const trimmed = body.trim();
  if (!trimmed) throw new AppError(400, 'Post body cannot be empty');
  if (trimmed.length > MAX_POST_LENGTH) {
    throw new AppError(400, `Post body cannot exceed ${MAX_POST_LENGTH} characters`);
  }
  const post = store.posts.find((p) => p.id === postId);
  if (!post) throw new AppError(404, 'Post not found');
  post.body = trimmed;
  await invalidateFeedCache();
  return post;
}

export async function updateOwnPost(
  postId: string,
  body: string,
  requesterId: string,
): Promise<Post> {
  const post = store.posts.find((p) => p.id === postId);
  if (!post) throw new AppError(404, 'Post not found');
  if (post.authorId !== requesterId) {
    throw new AppError(403, "Cannot edit another user's post");
  }
  return updatePost(postId, body);
}

export async function deletePost(postId: string): Promise<void> {
  const idx = store.posts.findIndex((p) => p.id === postId);
  if (idx === -1) throw new AppError(404, 'Post not found');
  await cascadeDeletePost(postId, idx);
}

export async function deleteOwnPost(postId: string, requesterId: string): Promise<void> {
  const idx = store.posts.findIndex((p) => p.id === postId);
  if (idx === -1) throw new AppError(404, 'Post not found');
  if (store.posts[idx].authorId !== requesterId) {
    throw new AppError(403, "Cannot delete another user's post");
  }
  await cascadeDeletePost(postId, idx);
}

// Cascade: comments and likes on the post would be orphaned otherwise
async function cascadeDeletePost(postId: string, idx: number): Promise<void> {
  store.comments.splice(
    0,
    store.comments.length,
    ...store.comments.filter((c) => c.postId !== postId),
  );
  for (const key of store.likes) {
    if (key.endsWith(`:${postId}`)) store.likes.delete(key);
  }
  store.posts.splice(idx, 1);
  await invalidateFeedCache();
}
