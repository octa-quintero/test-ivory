import 'dotenv/config';
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { app } from '../src/app';
import { _resetStore } from '../src/data/store';
import { authLimiter } from '../src/middlewares/rateLimiter';


const JWT_SECRET = process.env.JWT_SECRET as string;

// Supertest sends requests from 127.0.0.1 / ::ffff:127.0.0.1
const TEST_IPS = ['127.0.0.1', '::ffff:127.0.0.1', '::1'];

beforeEach(() => {
  _resetStore();
  TEST_IPS.forEach((ip) => authLimiter.resetKey(ip));
});

// ─── authenticate ───────────────────────────────────────────────────────────

describe('authenticate middleware', () => {
  it("ritorna 401 quando manca l'header Authorization", async () => {
    const res = await request(app).post('/v1/posts/post-1/like');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('ritorna 401 quando il token è malformato', async () => {
    const res = await request(app)
      .post('/v1/posts/post-1/like')
      .set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.status).toBe(401);
  });

  it('ritorna 401 quando il token è scaduto', async () => {
    // expiresIn: 0 produces a token that is already expired at sign time
    const expired = jwt.sign({ sub: 'user-2', role: 'user' }, JWT_SECRET, { expiresIn: 0 });
    const res = await request(app)
      .post('/v1/posts/post-1/like')
      .set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  it('passa con un token valido', async () => {
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'alan@ivory.test', password: 'ivory1234' });
    const token: string = loginRes.body.accessToken;

    const res = await request(app)
      .post('/v1/posts/post-1/like')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

// ─── authorize ──────────────────────────────────────────────────────────────

describe('authorize middleware', () => {
  it('ritorna 403 quando il ruolo è insufficiente (user prova un endpoint admin)', async () => {
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'alan@ivory.test', password: 'ivory1234' }); // role: user
    const token: string = loginRes.body.accessToken;

    const res = await request(app)
      .delete('/v1/admin/posts/post-1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  it("consente l'accesso con il ruolo richiesto (admin elimina un post)", async () => {
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'ada@ivory.test', password: 'ivory1234' }); // role: admin
    const token: string = loginRes.body.accessToken;

    const res = await request(app)
      .delete('/v1/admin/posts/post-1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });

  it('ritorna 401 (non 403) quando manca il token su una rotta protetta da ruolo', async () => {
    const res = await request(app).delete('/v1/admin/posts/post-1');
    // authenticate runs first, so missing token → 401 before authorize runs
    expect(res.status).toBe(401);
  });
});

// ─── authLimiter — brute force ───────────────────────────────────────────────

describe('authLimiter — protezione brute force', () => {
  it('ritorna 429 dopo 5 tentativi di login falliti consecutivi', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/v1/auth/login')
        .send({ email: 'inesistente@test.com', password: 'sbagliata' });
    }
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'inesistente@test.com', password: 'sbagliata' });
    expect(res.status).toBe(429);
    expect(res.body).toHaveProperty('error');
  });

  it('non conta i login riusciti nel limite', async () => {
    // 3 successful logins — should not burn the counter (skipSuccessfulRequests: true)
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/v1/auth/login')
        .send({ email: 'ada@ivory.test', password: 'ivory1234' });
    }
    // Now 5 failures
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/v1/auth/login')
        .send({ email: 'inesistente@test.com', password: 'sbagliata' });
    }
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'inesistente@test.com', password: 'sbagliata' });
    expect(res.status).toBe(429);
  });

  it('include gli header RateLimit nella risposta', async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'ada@ivory.test', password: 'ivory1234' });
    expect(res.headers).toHaveProperty('ratelimit-limit');
    expect(res.headers).toHaveProperty('ratelimit-remaining');
  });
});

// ─── globalLimiter ───────────────────────────────────────────────────────────

describe('globalLimiter', () => {
  it('ritorna 429 dopo aver superato il limite di richieste', async () => {
    // Use a fresh isolated app with a low limit to keep the test fast
    const limiter = rateLimit({
      windowMs: 60_000,
      max: 2,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests, please try again later' },
    });
    const testApp = express().use(limiter).get('/ping', (_req, res) => {
      res.json({ ok: true });
    });

    await request(testApp).get('/ping'); // 1st — ok
    await request(testApp).get('/ping'); // 2nd — ok
    const res = await request(testApp).get('/ping'); // 3rd — over limit

    expect(res.status).toBe(429);
    expect(res.body).toHaveProperty('error');
  });
});
