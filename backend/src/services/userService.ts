import { store } from '../data/store';
import { AppError } from '../types';
import type { PublicUser } from '../types';
import { invalidateFeedCache } from './feedService';

export function getUsers(): PublicUser[] {
  return store.users.map(({ password: _pw, ...pub }) => pub);
}

export function getMe(userId: string): PublicUser {
  const user = store.users.find((u) => u.id === userId);
  if (!user) throw new AppError(404, 'User not found');
  const { password: _pw, ...pub } = user;
  return pub;
}

export async function updateMe(
  userId: string,
  fields: { name?: string; email?: string },
): Promise<PublicUser> {
  const user = store.users.find((u) => u.id === userId);
  if (!user) throw new AppError(404, 'User not found');

  if (fields.email && fields.email !== user.email) {
    const taken = store.users.some((u) => u.id !== userId && u.email === fields.email);
    if (taken) throw new AppError(409, 'Email already in use');
    user.email = fields.email;
  }

  if (fields.name) user.name = fields.name;

  await invalidateFeedCache();
  const { password: _pw, ...pub } = user;
  return pub;
}

export async function deleteMe(userId: string): Promise<void> {
  const idx = store.users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new AppError(404, 'User not found');
  await cascadeDeleteUser(userId, idx);
}

export async function deleteUser(targetId: string, requesterId: string): Promise<void> {
  if (targetId === requesterId) throw new AppError(403, 'Cannot delete your own account');

  const idx = store.users.findIndex((u) => u.id === targetId);
  if (idx === -1) throw new AppError(404, 'User not found');

  await cascadeDeleteUser(targetId, idx);
}

async function cascadeDeleteUser(targetId: string, idx: number): Promise<void> {
  // Cascade: remove likes placed by the user
  for (const key of store.likes) {
    if (key.startsWith(`${targetId}:`)) {
      store.likes.delete(key);
      const postId = key.split(':')[1];
      const post = store.posts.find((p) => p.id === postId);
      if (post) post.likesCount = Math.max(0, post.likesCount - 1);
    }
  }

  // Cascade: remove likes on the user's posts
  const userPostIds = new Set(store.posts.filter((p) => p.authorId === targetId).map((p) => p.id));
  for (const key of store.likes) {
    if (userPostIds.has(key.split(':')[1])) store.likes.delete(key);
  }

  // Cascade: remove comments by the user and update commentsCount
  const userCommentPostIds = store.comments
    .filter((c) => c.authorId === targetId)
    .map((c) => c.postId);

  store.comments.splice(
    0,
    store.comments.length,
    ...store.comments.filter((c) => c.authorId !== targetId),
  );

  for (const postId of userCommentPostIds) {
    const post = store.posts.find((p) => p.id === postId);
    if (post) post.commentsCount = Math.max(0, post.commentsCount - 1);
  }

  // Cascade: remove comments on user's posts
  store.comments.splice(
    0,
    store.comments.length,
    ...store.comments.filter((c) => !userPostIds.has(c.postId)),
  );

  // Cascade: remove user's posts
  store.posts.splice(0, store.posts.length, ...store.posts.filter((p) => p.authorId !== targetId));

  // Remove user
  store.users.splice(idx, 1);

  await invalidateFeedCache();
}
