import { store } from '../data/store';
import { cacheGet, cacheSet } from '../config/redis';
import type { FeedResponse } from '../types';

const MAX_LIMIT = 20;
const CACHE_TTL = 60; // seconds
const feedCacheKey = (limit: number): string => `feed:first:${limit}`;

function buildFeedPage(limit: number, cursor?: string, userId?: string): FeedResponse {
  const sorted = [...store.posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  let start = 0;
  if (cursor) {
    const idx = sorted.findIndex((p) => p.id === cursor);
    if (idx !== -1) start = idx + 1;
  }

  const safeLimit = Math.min(limit, MAX_LIMIT);
  const page = sorted.slice(start, start + safeLimit);
  const hasMore = start + safeLimit < sorted.length;
  const nextCursor = page.length > 0 && hasMore ? (page[page.length - 1]?.id ?? null) : null;

  const posts = page.map((post) => {
    const user = store.users.find((u) => u.id === post.authorId);
    // strip password: User is structurally assignable to PublicUser, so the
    // compiler won't catch the leak if we spread the full store object
    const author = user
      ? { id: user.id, email: user.email, name: user.name, role: user.role }
      : { id: post.authorId, email: '', name: 'Unknown', role: 'user' as const };
    const likedByMe = userId ? store.likes.has(`${userId}:${post.id}`) : false;
    return { ...post, author, likedByMe };
  });

  return { posts, nextCursor };
}

export async function getFeed(
  limit: number,
  cursor?: string,
  userId?: string,
): Promise<FeedResponse> {
  // Only cache anonymous first-page requests — authenticated requests need
  // per-user likedByMe which would require a cache entry per user
  const isFirstPage = !cursor;
  const isAnonymous = !userId;

  if (isFirstPage && isAnonymous) {
    const cached = await cacheGet<FeedResponse>(feedCacheKey(limit));
    if (cached) return cached;
  }

  const result = buildFeedPage(limit, cursor, userId);

  if (isFirstPage && isAnonymous) {
    await cacheSet(feedCacheKey(limit), result, CACHE_TTL);
  }

  return result;
}

export async function invalidateFeedCache(): Promise<void> {
  const { cacheDel } = await import('../config/redis');
  await cacheDel('feed:first:*');
}
