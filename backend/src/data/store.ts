import type { User, Post, Comment } from '../types';

function makeSeedUsers(): User[] {
  return [
    {
      id: 'user-1',
      email: 'ada@ivory.test',
      password: 'ivory1234',
      name: 'Ada Lovelace',
      role: 'admin',
    },
    {
      id: 'user-2',
      email: 'alan@ivory.test',
      password: 'ivory1234',
      name: 'Alan Turing',
      role: 'user',
    },
  ];
}

function makeSeedPosts(): Post[] {
  return [
    {
      id: 'post-1',
      authorId: 'user-1',
      body: 'TypeScript strict mode: al principio duele, después no puedes vivir sin él.',
      createdAt: '2026-06-01T08:00:00.000Z',
      likesCount: 14,
      commentsCount: 0,
    },
    {
      id: 'post-2',
      authorId: 'user-2',
      body: 'Un algoritmo es como una receta: los ingredientes importan, pero el orden importa más.',
      createdAt: '2026-06-02T09:30:00.000Z',
      likesCount: 22,
      commentsCount: 0,
    },
    {
      id: 'post-3',
      authorId: 'user-1',
      body: 'Los tests no son opcionales. Son la documentación que no miente.',
      createdAt: '2026-06-03T11:00:00.000Z',
      likesCount: 41,
      commentsCount: 0,
    },
    {
      id: 'post-4',
      authorId: 'user-2',
      body: 'Patrón repository: escribe la interfaz una vez, cambia el storage cuando quieras.',
      createdAt: '2026-06-04T14:15:00.000Z',
      likesCount: 18,
      commentsCount: 0,
    },
    {
      id: 'post-5',
      authorId: 'user-1',
      body: 'Docker Compose cambió mi vida. Antes: "en mi máquina funciona". Ahora: funciona en todas.',
      createdAt: '2026-06-05T16:45:00.000Z',
      likesCount: 73,
      commentsCount: 0,
    },
    {
      id: 'post-6',
      authorId: 'user-2',
      body: 'La idempotencia no es un lujo, es una necesidad en cualquier API de producción.',
      createdAt: '2026-06-06T10:00:00.000Z',
      likesCount: 36,
      commentsCount: 0,
    },
    {
      id: 'post-7',
      authorId: 'user-1',
      body: 'Zod + TypeScript: los tipos se infieren del schema. Sin duplicación. Sin mentiras.',
      createdAt: '2026-06-07T13:20:00.000Z',
      likesCount: 29,
      commentsCount: 0,
    },
    {
      id: 'post-8',
      authorId: 'user-2',
      body: 'Redis como cache para el feed: la primera página en menos de 10ms. Vale cada línea.',
      createdAt: '2026-06-08T09:00:00.000Z',
      likesCount: 88,
      commentsCount: 0,
    },
    {
      id: 'post-9',
      authorId: 'user-1',
      body: 'Express sigue siendo relevante. Simple, predecible, cualquier dev lo entiende en segundos.',
      createdAt: '2026-06-09T17:30:00.000Z',
      likesCount: 55,
      commentsCount: 0,
    },
    {
      id: 'post-10',
      authorId: 'user-2',
      body: 'Primer día en el nuevo proyecto. El codebase tiene 3 años y cero tests. Empezamos.',
      createdAt: '2026-06-10T08:45:00.000Z',
      likesCount: 62,
      commentsCount: 0,
    },
  ];
}

const users: User[] = makeSeedUsers();
const posts: Post[] = makeSeedPosts();
const comments: Comment[] = [];

// "userId:postId" — O(1) idempotent like lookup
const likes = new Set<string>();

export const store = { users, posts, comments, likes };

// Exposed for test teardown only
export function _resetStore(): void {
  users.length = 0;
  users.push(...makeSeedUsers());
  posts.length = 0;
  posts.push(...makeSeedPosts());
  comments.length = 0;
  likes.clear();
}
