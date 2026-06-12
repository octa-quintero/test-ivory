import 'dotenv/config';
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { _resetStore } from '../src/data/store';

async function loginAs(email: string, password = 'ivory1234'): Promise<string> {
  const res = await request(app).post('/v1/auth/login').send({ email, password });
  return res.body.accessToken as string;
}

beforeEach(() => {
  _resetStore();
});

describe('GET /v1/admin/users', () => {
  it('admin ottiene la lista degli utenti', async () => {
    const adminToken = await loginAs('ada@ivory.test');

    const res = await request(app)
      .get('/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBeGreaterThan(0);
  });

  it('utente con ruolo user non può listare — ritorna 403', async () => {
    const userToken = await loginAs('alan@ivory.test');

    const res = await request(app)
      .get('/v1/admin/users')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it('senza token ritorna 401', async () => {
    const res = await request(app).get('/v1/admin/users');
    expect(res.status).toBe(401);
  });
});

describe('DELETE /v1/admin/users/:userId', () => {
  it('admin può eliminare un altro utente — ritorna 204', async () => {
    const adminToken = await loginAs('ada@ivory.test');

    const res = await request(app)
      .delete('/v1/admin/users/user-2')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });

  it("l'utente eliminato non può più fare login", async () => {
    const adminToken = await loginAs('ada@ivory.test');
    await request(app)
      .delete('/v1/admin/users/user-2')
      .set('Authorization', `Bearer ${adminToken}`);

    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'alan@ivory.test', password: 'ivory1234' });

    expect(loginRes.status).toBe(401);
  });

  it('admin non può eliminare se stesso — ritorna 403', async () => {
    const adminToken = await loginAs('ada@ivory.test');

    const res = await request(app)
      .delete('/v1/admin/users/user-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  it('utente con ruolo user non può eliminare — ritorna 403', async () => {
    const userToken = await loginAs('alan@ivory.test');

    const res = await request(app)
      .delete('/v1/admin/users/user-1')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it('userId inesistente ritorna 404', async () => {
    const adminToken = await loginAs('ada@ivory.test');

    const res = await request(app)
      .delete('/v1/admin/users/nonexistent')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('senza token ritorna 401', async () => {
    const res = await request(app).delete('/v1/admin/users/user-2');
    expect(res.status).toBe(401);
  });
});
