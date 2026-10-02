import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import { adminAiRouter } from '../src/server/routes/adminAiRoutes.js';
import { userAiRouter } from '../src/server/routes/userAiRoutes.js';
import { generateToken } from '../src/server/auth.js';
import { getDatabase } from '../src/database/db.js';

describe('Admin & User API Security Routes', () => {
  let app: express.Express;
  let adminToken: string;
  let regularUserToken: string;
  let regularUserId: string;

  before(async () => {
    process.env.ADMIN_EMAIL = 'admin@example.com';
    const db = await getDatabase();

    const adminUser = await db.createUser({
      id: 'admin_test_1',
      email: 'admin@example.com',
      password_hash: 'dummy_hash',
      name: 'Super Admin',
      role: 'ADMIN',
    });

    const regularUser = await db.createUser({
      id: 'user_norm_' + Date.now(),
      email: 'user_norm_' + Date.now() + '@example.com',
      password_hash: 'dummy_hash',
      name: 'Normal User',
      role: 'USER',
    });
    regularUserId = regularUser.id;

    adminToken = generateToken(adminUser);
    regularUserToken = generateToken(regularUser);

    app = express();
    app.use(express.json());
    app.use('/api/admin/ai', adminAiRouter);
    app.use('/api/user/ai', userAiRouter);
  });

  it('SEC-01: Anonymous requests to /api/admin/ai/settings are rejected with 401', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/admin/ai/settings`);
      assert.strictEqual(res.status, 401);
    } finally {
      server.close();
    }
  });

  it('SEC-02: Regular USER requests to /api/admin/ai/settings are rejected with 403 Forbidden', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/admin/ai/settings`, {
        headers: { Authorization: `Bearer ${regularUserToken}` },
      });
      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.includes('ADMIN_ACCESS_REQUIRED'));
    } finally {
      server.close();
    }
  });

  it('SEC-03: ADMIN requests to /api/admin/ai/settings succeed with 200', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/admin/ai/settings`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.ok(body.config);
      assert.ok(body.config.allowedModes);
    } finally {
      server.close();
    }
  });

  it('SEC-04: User can query /api/user/ai/capabilities with user token', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/user/ai/capabilities`, {
        headers: { Authorization: `Bearer ${regularUserToken}` },
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.ok(body.capabilities);
      assert.ok(Array.isArray(body.capabilities.allowedModes));
    } finally {
      server.close();
    }
  });
});
