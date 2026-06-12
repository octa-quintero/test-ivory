import { apiClient } from './client';
import type {
  LoginResponse,
  FeedResponse,
  CommentsResponse,
  CreateCommentResponse,
  AdminPostsResponse,
  AdminUsersResponse,
  AdminPost,
  Comment,
  Post,
  User,
} from '../types';

export async function login(email: string, password?: string): Promise<LoginResponse> {
  // login mock: senza password si entra solo con l'email
  const body = password ? { email, password } : { email };
  const res = await apiClient.post<LoginResponse>('/v1/auth/login', body);
  return res.data;
}

export async function getFeed(limit: number, cursor?: string): Promise<FeedResponse> {
  const params: Record<string, string | number> = { limit };
  if (cursor) params.cursor = cursor;
  const res = await apiClient.get<FeedResponse>('/v1/feed', { params });
  return res.data;
}

export async function createPost(body: string): Promise<Post> {
  const res = await apiClient.post<{ post: Post }>('/v1/posts', { body });
  return res.data.post;
}

export async function updatePost(postId: string, body: string): Promise<Post> {
  const res = await apiClient.patch<{ post: Post }>(`/v1/posts/${postId}`, { body });
  return res.data.post;
}

export async function deletePost(postId: string): Promise<void> {
  await apiClient.delete(`/v1/posts/${postId}`);
}

export async function likePost(postId: string): Promise<void> {
  await apiClient.post(`/v1/posts/${postId}/like`);
}

export async function unlikePost(postId: string): Promise<void> {
  await apiClient.delete(`/v1/posts/${postId}/like`);
}

export async function getComments(postId: string): Promise<CommentsResponse> {
  const res = await apiClient.get<CommentsResponse>(`/v1/posts/${postId}/comments`);
  return res.data;
}

export async function createComment(
  postId: string,
  body: string,
): Promise<CreateCommentResponse> {
  const res = await apiClient.post<CreateCommentResponse>(`/v1/posts/${postId}/comments`, {
    body,
  });
  return res.data;
}

export async function updateComment(
  postId: string,
  commentId: string,
  body: string,
): Promise<{ comment: Comment }> {
  const res = await apiClient.patch<{ comment: Comment }>(
    `/v1/posts/${postId}/comments/${commentId}`,
    { body },
  );
  return res.data;
}

export async function deleteComment(
  postId: string,
  commentId: string,
): Promise<{ commentsCount: number }> {
  const res = await apiClient.delete<{ commentsCount: number }>(
    `/v1/posts/${postId}/comments/${commentId}`,
  );
  return res.data;
}

export async function deleteMe(): Promise<void> {
  await apiClient.delete('/v1/me');
}

export async function getMe(): Promise<{ user: User }> {
  const res = await apiClient.get<{ user: User }>('/v1/me');
  return res.data;
}

export async function updateMe(fields: {
  name?: string;
  email?: string;
}): Promise<{ user: User }> {
  const res = await apiClient.patch<{ user: User }>('/v1/me', fields);
  return res.data;
}

export async function getAdminPosts(): Promise<AdminPostsResponse> {
  const res = await apiClient.get<AdminPostsResponse>('/v1/admin/posts');
  return res.data;
}

export async function deleteAdminPost(postId: string): Promise<void> {
  await apiClient.delete(`/v1/admin/posts/${postId}`);
}

export async function updateAdminPost(postId: string, body: string): Promise<AdminPost> {
  const res = await apiClient.patch<{ post: AdminPost }>(`/v1/admin/posts/${postId}`, { body });
  return res.data.post;
}

export async function getAdminUsers(): Promise<AdminUsersResponse> {
  const res = await apiClient.get<AdminUsersResponse>('/v1/admin/users');
  return res.data;
}

export async function deleteAdminUser(userId: string): Promise<void> {
  await apiClient.delete(`/v1/admin/users/${userId}`);
}
