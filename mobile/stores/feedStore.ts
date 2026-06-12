import { create } from 'zustand';

import * as endpoints from '../api/endpoints';
import type { Post } from '../types';

interface FeedState {
  posts: Post[];
  nextCursor: string | null;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  likeError: string | null;
  pendingLikes: Set<string>;
  fetchFeed: () => Promise<void>;
  loadMore: () => Promise<void>;
  toggleLike: (postId: string, likedByMe: boolean) => Promise<void>;
  updateCommentsCount: (postId: string, commentsCount: number) => void;
  createPost: (body: string) => Promise<void>;
  updatePost: (postId: string, body: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  clearLikeError: () => void;
}

const FEED_LIMIT = 10;

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  nextCursor: null,
  loading: false,
  loadingMore: false,
  error: null,
  likeError: null,
  pendingLikes: new Set(),

  fetchFeed: async () => {
    set({ loading: true, error: null });
    try {
      const { posts, nextCursor } = await endpoints.getFeed(FEED_LIMIT);
      set({ posts, nextCursor, loading: false });
    } catch {
      set({ error: 'Impossibile caricare il feed.', loading: false });
    }
  },

  loadMore: async () => {
    const { nextCursor, loadingMore, posts } = get();
    if (!nextCursor || loadingMore) return;
    set({ loadingMore: true });
    try {
      const res = await endpoints.getFeed(FEED_LIMIT, nextCursor);
      set({ posts: [...posts, ...res.posts], nextCursor: res.nextCursor, loadingMore: false });
    } catch {
      set({ loadingMore: false });
    }
  },

  toggleLike: async (postId: string, likedByMe: boolean) => {
    const { pendingLikes } = get();
    if (pendingLikes.has(postId)) return;

    // Optimistic update
    set((state) => ({
      likeError: null,
      pendingLikes: new Set(state.pendingLikes).add(postId),
      posts: state.posts.map((p) =>
        p.id === postId
          ? { ...p, likedByMe: !likedByMe, likesCount: p.likesCount + (likedByMe ? -1 : 1) }
          : p,
      ),
    }));

    try {
      if (likedByMe) {
        await endpoints.unlikePost(postId);
      } else {
        await endpoints.likePost(postId);
      }
    } catch {
      // Rollback en caso de error
      set((state) => ({
        likeError: 'Impossibile aggiornare il like. Riprova.',
        posts: state.posts.map((p) =>
          p.id === postId
            ? { ...p, likedByMe, likesCount: p.likesCount + (likedByMe ? 1 : -1) }
            : p,
        ),
      }));
    } finally {
      set((state) => {
        const next = new Set(state.pendingLikes);
        next.delete(postId);
        return { pendingLikes: next };
      });
    }
  },

  updateCommentsCount: (postId: string, commentsCount: number) => {
    set((state) => ({
      posts: state.posts.map((p) => (p.id === postId ? { ...p, commentsCount } : p)),
    }));
  },

  createPost: async (body: string) => {
    await endpoints.createPost(body);
    // Refresh feed so the new post (with author + likedByMe) appears correctly
    const { posts, nextCursor } = await endpoints.getFeed(FEED_LIMIT);
    set({ posts, nextCursor });
  },

  updatePost: async (postId: string, body: string) => {
    const updated = await endpoints.updatePost(postId, body);
    set((state) => ({
      posts: state.posts.map((p) => (p.id === postId ? { ...p, body: updated.body } : p)),
    }));
  },

  deletePost: async (postId: string) => {
    await endpoints.deletePost(postId);
    set((state) => ({
      posts: state.posts.filter((p) => p.id !== postId),
    }));
  },

  clearLikeError: () => set({ likeError: null }),
}));
