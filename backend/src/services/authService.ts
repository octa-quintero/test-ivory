import jwt from 'jsonwebtoken';

import { config } from '../config';
import { store } from '../data/store';
import { AppError } from '../types';
import type { PublicUser } from '../types';

export function login(email: string, password?: string): { accessToken: string; user: PublicUser } {
  const user = store.users.find((u) => u.email === email);
  if (!user) throw new AppError(401, 'No account found for that email');
  // login mock per spec: senza password si entra solo con l'email;
  // se la password viene inviata, deve essere corretta
  if (password !== undefined && user.password !== password) {
    throw new AppError(401, 'Invalid password');
  }

  // role in the payload avoids a store lookup on every authenticated request
  const accessToken = jwt.sign({ sub: user.id, role: user.role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });

  const { password: _omit, ...publicUser } = user;

  return { accessToken, user: publicUser };
}
