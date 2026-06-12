export type Role = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
}

export type PublicUser = Omit<User, 'password'>;
