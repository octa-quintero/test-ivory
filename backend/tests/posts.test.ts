import 'dotenv/config';
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { _resetStore } from '../src/data/store';

beforeEach(() => {
  _resetStore();
});

describe('POST /v1/auth/login', () => {
  it('login con email valida ritorna accessToken e user', async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'ada@ivory.test', password: 'ivory1234' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user).toMatchObject({ email: 'ada@ivory.test', name: 'Ada Lovelace' });
  });

  it('login mock solo con email (senza password) ritorna 200', async () => {
    const res = await request(app).post('/v1/auth/login').send({ email: 'ada@ivory.test' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('login con password errata ritorna 401', async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'ada@ivory.test', password: 'sbagliata' });

    expect(res.status).toBe(401);
  });

  it('login con email inesistente ritorna 401', async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'inesistente@test.com', password: 'qualsiasi' });

    expect(res.status).toBe(401);
  });
});

describe('GET /v1/feed', () => {
  it('ritorna 200 con post che includono likedByMe, likesCount e commentsCount', async () => {
    const res = await request(app).get('/v1/feed?limit=3');

    expect(res.status).toBe(200);
    expect(res.body.posts).toHaveLength(3);

    const post = res.body.posts[0];
    expect(post).toHaveProperty('likedByMe');
    expect(post).toHaveProperty('likesCount');
    expect(post).toHaveProperty('commentsCount');
    expect(post).toHaveProperty('author');
  });

  it("l'author non espone il campo password", async () => {
    const res = await request(app).get('/v1/feed?limit=20');

    expect(res.status).toBe(200);
    for (const post of res.body.posts as { author: Record<string, unknown> }[]) {
      expect(post.author).not.toHaveProperty('password');
    }
  });

  it('rispetta il cursor per la paginazione', async () => {
    const page1 = await request(app).get('/v1/feed?limit=3');
    const cursor = page1.body.nextCursor;

    const page2 = await request(app).get(`/v1/feed?limit=3&cursor=${cursor}`);

    expect(page2.status).toBe(200);
    const ids1 = page1.body.posts.map((p: { id: string }) => p.id);
    const ids2 = page2.body.posts.map((p: { id: string }) => p.id);
    expect(ids1).not.toEqual(ids2);
  });
});

describe('POST /v1/posts/:id/like — idempotenza', () => {
  it('doppio like con lo stesso utente non duplica likesCount', async () => {
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'ada@ivory.test', password: 'ivory1234' });
    const token: string = loginRes.body.accessToken;

    const feedRes = await request(app).get('/v1/feed?limit=1');
    const postId: string = feedRes.body.posts[0].id;
    const initialLikes: number = feedRes.body.posts[0].likesCount;

    await request(app)
      .post(`/v1/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`);

    await request(app)
      .post(`/v1/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`);

    const updated = await request(app).get('/v1/feed?limit=20');
    const updatedPost = updated.body.posts.find((p: { id: string }) => p.id === postId);

    expect(updatedPost.likesCount).toBe(initialLikes + 1);
  });
});

describe('POST /v1/posts', () => {
  it('utente autenticato può creare un post — ritorna 201', async () => {
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'alan@ivory.test', password: 'ivory1234' });
    const token: string = loginRes.body.accessToken;

    const res = await request(app)
      .post('/v1/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Il mio primo post dalla API.' });

    expect(res.status).toBe(201);
    expect(res.body.post).toMatchObject({
      body: 'Il mio primo post dalla API.',
      authorId: 'user-2',
      likesCount: 0,
      commentsCount: 0,
    });
  });

  it('il post creato appare nella feed', async () => {
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'alan@ivory.test', password: 'ivory1234' });
    const token: string = loginRes.body.accessToken;

    const { body: created } = await request(app)
      .post('/v1/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Post visibile nella feed.' });

    const feedRes = await request(app).get('/v1/feed?limit=1');
    expect(feedRes.body.posts[0].id).toBe(created.post.id);
  });

  it('body vuoto ritorna 400', async () => {
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'alan@ivory.test', password: 'ivory1234' });
    const token: string = loginRes.body.accessToken;

    const res = await request(app)
      .post('/v1/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ body: '   ' });

    expect(res.status).toBe(400);
  });

  it('senza token ritorna 401', async () => {
    const res = await request(app)
      .post('/v1/posts')
      .send({ body: 'Senza auth.' });
    expect(res.status).toBe(401);
  });
});

describe('PATCH/DELETE /v1/posts/:id — ownership', () => {
  async function tokenFor(email: string): Promise<string> {
    const res = await request(app).post('/v1/auth/login').send({ email });
    return res.body.accessToken as string;
  }

  it("l'autore può modificare il proprio post", async () => {
    const token = await tokenFor('alan@ivory.test');
    const { body: created } = await request(app)
      .post('/v1/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Originale' });

    const res = await request(app)
      .patch(`/v1/posts/${created.post.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Modificato' });

    expect(res.status).toBe(200);
    expect(res.body.post.body).toBe('Modificato');
  });

  it('modificare il post di un altro utente ritorna 403', async () => {
    const alanToken = await tokenFor('alan@ivory.test');
    const adaToken = await tokenFor('ada@ivory.test');
    const { body: created } = await request(app)
      .post('/v1/posts')
      .set('Authorization', `Bearer ${alanToken}`)
      .send({ body: 'Post di Alan' });

    const res = await request(app)
      .patch(`/v1/posts/${created.post.id}`)
      .set('Authorization', `Bearer ${adaToken}`)
      .send({ body: 'Hackerato' });

    expect(res.status).toBe(403);
  });

  it("l'autore può eliminare il proprio post e i suoi commenti scompaiono", async () => {
    const token = await tokenFor('alan@ivory.test');
    const { body: created } = await request(app)
      .post('/v1/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Post da eliminare' });
    const postId: string = created.post.id;

    await request(app)
      .post(`/v1/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Commento orfano' });

    const del = await request(app)
      .delete(`/v1/posts/${postId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);

    const comments = await request(app).get(`/v1/posts/${postId}/comments`);
    expect(comments.status).toBe(404);
  });

  it('eliminare il post di un altro utente ritorna 403', async () => {
    const alanToken = await tokenFor('alan@ivory.test');
    const adaToken = await tokenFor('ada@ivory.test');
    const { body: created } = await request(app)
      .post('/v1/posts')
      .set('Authorization', `Bearer ${alanToken}`)
      .send({ body: 'Post protetto' });

    const res = await request(app)
      .delete(`/v1/posts/${created.post.id}`)
      .set('Authorization', `Bearer ${adaToken}`);

    expect(res.status).toBe(403);
  });
});

describe('PATCH /v1/posts/:id/comments/:commentId — ownership', () => {
  async function tokenFor(email: string): Promise<string> {
    const res = await request(app).post('/v1/auth/login').send({ email });
    return res.body.accessToken as string;
  }

  it("l'autore può modificare il proprio commento", async () => {
    const token = await tokenFor('alan@ivory.test');
    const feedRes = await request(app).get('/v1/feed?limit=1');
    const postId: string = feedRes.body.posts[0].id;

    const { body: created } = await request(app)
      .post(`/v1/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Commento originale' });

    const res = await request(app)
      .patch(`/v1/posts/${postId}/comments/${created.comment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Commento modificato' });

    expect(res.status).toBe(200);
    expect(res.body.comment.body).toBe('Commento modificato');
  });

  it('modificare il commento di un altro utente ritorna 403', async () => {
    const alanToken = await tokenFor('alan@ivory.test');
    const adaToken = await tokenFor('ada@ivory.test');
    const feedRes = await request(app).get('/v1/feed?limit=1');
    const postId: string = feedRes.body.posts[0].id;

    const { body: created } = await request(app)
      .post(`/v1/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${alanToken}`)
      .send({ body: 'Commento di Alan' });

    const res = await request(app)
      .patch(`/v1/posts/${postId}/comments/${created.comment.id}`)
      .set('Authorization', `Bearer ${adaToken}`)
      .send({ body: 'Modificato da Ada' });

    expect(res.status).toBe(403);
  });

  it('commento modificato vuoto ritorna 400', async () => {
    const token = await tokenFor('alan@ivory.test');
    const feedRes = await request(app).get('/v1/feed?limit=1');
    const postId: string = feedRes.body.posts[0].id;

    const { body: created } = await request(app)
      .post(`/v1/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Commento valido' });

    const res = await request(app)
      .patch(`/v1/posts/${postId}/comments/${created.comment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: '   ' });

    expect(res.status).toBe(400);
  });
});

describe('POST /v1/posts/:id/like — unlike idempotenza', () => {
  it('doppio unlike senza like precedente non rompe lo stato', async () => {
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'ada@ivory.test', password: 'ivory1234' });
    const token: string = loginRes.body.accessToken;

    const feedRes = await request(app).get('/v1/feed?limit=1');
    const postId: string = feedRes.body.posts[0].id;
    const initialLikes: number = feedRes.body.posts[0].likesCount;

    await request(app)
      .delete(`/v1/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`);

    await request(app)
      .delete(`/v1/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`);

    const updated = await request(app).get('/v1/feed?limit=1');
    expect(updated.body.posts[0].likesCount).toBe(initialLikes);
  });
});

describe('POST /v1/posts/:id/comments', () => {
  it('corpo vuoto ritorna 400', async () => {
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'ada@ivory.test', password: 'ivory1234' });
    const token: string = loginRes.body.accessToken;

    const res = await request(app)
      .post('/v1/posts/post-1/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({ body: '   ' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('commento di esattamente 500 caratteri è valido', async () => {
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'ada@ivory.test', password: 'ivory1234' });
    const token: string = loginRes.body.accessToken;

    const res = await request(app)
      .post('/v1/posts/post-1/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'a'.repeat(500) });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('comment');
    expect(res.body).toHaveProperty('commentsCount');
  });

  it('commento di 501 caratteri ritorna 400', async () => {
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'ada@ivory.test', password: 'ivory1234' });
    const token: string = loginRes.body.accessToken;

    const res = await request(app)
      .post('/v1/posts/post-1/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'a'.repeat(501) });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /v1/posts/:id', () => {
  it('ritorna il post con i suoi campi', async () => {
    const res = await request(app).get('/v1/posts/post-1');

    expect(res.status).toBe(200);
    expect(res.body.post).toMatchObject({ id: 'post-1', authorId: 'user-1' });
  });

  it('postId inesistente ritorna 404', async () => {
    const res = await request(app).get('/v1/posts/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /v1/posts/:id/comments', () => {
  it('postId inesistente ritorna 404', async () => {
    const res = await request(app).get('/v1/posts/nonexistent/comments');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('ritorna nextCursor quando ci sono altri commenti', async () => {
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'ada@ivory.test', password: 'ivory1234' });
    const token: string = loginRes.body.accessToken;

    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/v1/posts/post-1/comments')
        .set('Authorization', `Bearer ${token}`)
        .send({ body: `Commento ${i + 1}` });
    }

    const res = await request(app).get('/v1/posts/post-1/comments?limit=2');

    expect(res.status).toBe(200);
    expect(res.body.comments).toHaveLength(2);
    expect(res.body.nextCursor).not.toBeNull();
  });
});

describe('GET /health', () => {
  it('ritorna status ok con uptime e versione', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('startedAt');
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('redis');
  });
});
