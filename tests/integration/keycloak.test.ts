import { describe, it, expect, beforeAll } from 'vitest';
import { KeycloakConnector } from '@acg/connectors';

// Keycloak 24+ dev mode uses a self-signed cert
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? 'https://localhost:8444';
const KC_ADMIN = process.env.KEYCLOAK_ADMIN ?? 'admin';
const KC_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD ?? 'admin';

let adminToken = '';

const fetchKC = (opts: RequestInit & { path: string }) =>
  fetch(`${KEYCLOAK_URL}${opts.path}`, {
    ...opts,
    signal: AbortSignal.timeout(15000),
  });

async function getAdminToken(): Promise<string> {
  const res = await fetchKC({
    path: '/realms/master/protocol/openid-connect/token',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: KC_ADMIN,
      password: KC_ADMIN_PASSWORD,
      scope: 'openid email profile',
    }),
  });
  if (!res.ok) throw new Error(`Keycloak auth failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function adminHeaders() {
  return {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json' as const,
  };
}

// ============================================
// Keycloak Integration Tests
// ============================================
describe('Keycloak Integration', () => {
  const keycloak = new KeycloakConnector(KEYCLOAK_URL);

  beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  it('health check — master realm exists', async () => {
    const realm = await keycloak.getRealm({ realm: 'master' });
    expect(realm).toBeDefined();
    expect((realm as Record<string, unknown>).realm).toBe('master');
  });

  it('admin token is valid via userinfo', async () => {
    const result = await keycloak.validateToken({
      token: adminToken,
      realm: 'master',
    });
    expect(result.valid).toBe(true);
    expect(result.sub).toBeTruthy();
  });

  it('invalid token is rejected', async () => {
    const result = await keycloak.validateToken({
      token: 'garbage-token',
      realm: 'master',
    });
    expect(result.valid).toBe(false);
  });

  it('can create a test realm', async () => {
    const res = await fetchKC({
      path: '/admin/realms',
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ realm: 'acg-test', enabled: true }),
    });
    expect(res.status).toBe(201);

    const realm = await keycloak.getRealm({ realm: 'acg-test' });
    expect((realm as Record<string, unknown>).realm).toBe('acg-test');
  });

  it('can create a user with password in the test realm', async () => {
    const res = await fetchKC({
      path: '/admin/realms/acg-test/users',
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({
        username: 'test-user',
        email: 'test@acg.ai',
        emailVerified: true,
        firstName: 'Test',
        lastName: 'User',
        enabled: true,
        credentials: [
          { type: 'password', value: 'test-pass-123', temporary: false },
        ],
      }),
    });
    expect(res.status).toBe(201);
  });

  it('can create a confidential client with direct access grants', async () => {
    const res = await fetchKC({
      path: '/admin/realms/acg-test/clients',
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({
        clientId: 'acg-gateway',
        enabled: true,
        protocol: 'openid-connect',
        publicClient: false,
        secret: 'test-secret',
        directAccessGrantsEnabled: true,
        serviceAccountsEnabled: false,
      }),
    });
    expect(res.status).toBe(201);
  });

  it('can obtain a user token via direct access grant', async () => {
    const res = await fetchKC({
      path: '/realms/acg-test/protocol/openid-connect/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: 'acg-gateway',
        client_secret: 'test-secret',
        username: 'test-user',
        password: 'test-pass-123',
        scope: 'openid email profile',
      }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      access_token: string;
      token_type: string;
    };
    expect(data.access_token).toBeTruthy();
    expect(data.token_type).toBe('Bearer');
  });

  it('validates a newly created user token via userinfo', async () => {
    const tokenRes = await fetchKC({
      path: '/realms/acg-test/protocol/openid-connect/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: 'acg-gateway',
        client_secret: 'test-secret',
        username: 'test-user',
        password: 'test-pass-123',
        scope: 'openid email profile',
      }),
    });
    const tokenData = (await tokenRes.json()) as { access_token: string };

    const result = await keycloak.validateToken({
      token: tokenData.access_token,
      realm: 'acg-test',
    });
    expect(result.valid).toBe(true);
    expect(result.sub).toBeTruthy();
  });

  it('can delete the test realm', async () => {
    const res = await fetchKC({
      path: '/admin/realms/acg-test',
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(204);
  });
});
