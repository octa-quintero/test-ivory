export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

export interface Post {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  author: User;
  likedByMe: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface FeedResponse {
  posts: Post[];
  nextCursor: string | null;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface CommentsResponse {
  comments: Comment[];
}

export interface CreateCommentResponse {
  comment: Comment;
  commentsCount: number;
}

export interface AdminPost {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
}

export interface AdminPostsResponse {
  posts: AdminPost[];
}

export interface AdminUsersResponse {
  users: User[];
}
