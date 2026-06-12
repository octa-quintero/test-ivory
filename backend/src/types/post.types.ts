import type { PublicUser } from './user.types';

export interface Post {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
}

export interface FeedPost extends Post {
  author: PublicUser;
  likedByMe: boolean;
}

export interface FeedResponse {
  posts: FeedPost[];
  nextCursor: string | null;
}
