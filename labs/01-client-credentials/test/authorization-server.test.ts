import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateKeyPair, jwtVerify } from 'jose';
import { createAuthorizationServer } from '../src/authorization-server.js';
import {
  allowedScopes,
  audience,
  clientId,
  isRecord,
} from '../src/contracts.js';
import { basicAuth, listen } from './support.js';
import type { AuthorizationConfig } from '../src/authorization-server.js';

await test('RFC 6749: empty parameters are treated as omitted and unknown parameters are ignored', async (t) => {
  const keys = await generateKeyPair('RS256');
  const server = await listen(
    createAuthorizationServer({
      clientId,
      clientSecret: 'test-only-secret',
      allowedScopes,
      defaultScope: 'catalog:read',
      issuer: 'http://127.0.0.1:9000',
      audience,
      privateKey: keys.privateKey,
      tokenLifetimeSeconds: 60,
    }),
  );
  t.after(server.close);
  const headers = { authorization: basicAuth(clientId, 'test-only-secret') };
  const emptyScope = await fetch(`${server.url}/token`, {
    method: 'POST',
    headers,
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: '',
      unknown: 'ignored',
    }),
  });
  assert.equal(emptyScope.status, 200);
  const body: unknown = await emptyScope.json();
  assert.ok(isRecord(body));
  assert.equal(body.scope, 'catalog:read');
  const emptyGrant = await fetch(`${server.url}/token`, {
    method: 'POST',
    headers,
    body: new URLSearchParams({ grant_type: '' }),
  });
  assert.equal(emptyGrant.status, 400);
  assert.deepEqual(await emptyGrant.json(), { error: 'invalid_request' });
});

await test('a valid client receives a scoped access token over HTTP', async (t) => {
  const keys = await generateKeyPair('RS256');
  const issuer = 'http://127.0.0.1:9000';
  const server = await listen(
    createAuthorizationServer({
      clientId,
      clientSecret: 'test-only-secret',
      allowedScopes,
      defaultScope: 'catalog:read',
      issuer,
      audience,
      privateKey: keys.privateKey,
      tokenLifetimeSeconds: 60,
    }),
  );
  t.after(server.close);
  const response = await fetch(`${server.url}/token`, {
    method: 'POST',
    headers: { authorization: basicAuth(clientId, 'test-only-secret') },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'catalog:read',
    }),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('pragma'), 'no-cache');
  const body: unknown = await response.json();
  assert.ok(isRecord(body));
  assert.equal(typeof body.access_token, 'string');
  assert.equal(body.token_type, 'Bearer');
  assert.equal(body.expires_in, 60);
  assert.equal(body.scope, 'catalog:read');
  assert.equal(body.refresh_token, undefined);
  assert.equal(body.id_token, undefined);
  assert.ok(typeof body.access_token === 'string');
  const { payload, protectedHeader } = await jwtVerify(
    body.access_token,
    keys.publicKey,
    {
      algorithms: ['RS256'],
      issuer,
      audience,
      typ: 'at+jwt',
    },
  );
  assert.equal(protectedHeader.alg, 'RS256');
  assert.equal(payload.sub, clientId);
  assert.equal(payload.client_id, clientId);
  assert.equal(payload.scope, body.scope);
  assert.equal(typeof payload.jti, 'string');
  assert.equal(typeof payload.iat, 'number');
  assert.equal(typeof payload.exp, 'number');
});

await test('client, grant, format, and scope rejections at the token endpoint', async (t) => {
  const keys = await generateKeyPair('RS256');
  const server = await listen(
    createAuthorizationServer({
      clientId,
      clientSecret: 'test-only-secret',
      allowedScopes,
      defaultScope: 'catalog:read',
      issuer: 'http://127.0.0.1:9000',
      audience,
      privateKey: keys.privateKey,
      tokenLifetimeSeconds: 60,
    }),
  );
  t.after(server.close);
  const validAuth = basicAuth(clientId, 'test-only-secret');
  const cases = [
    {
      name: 'wrong secret',
      auth: basicAuth(clientId, 'wrong'),
      body: 'grant_type=client_credentials',
      status: 401,
      error: 'invalid_client',
    },
    {
      name: 'unknown client',
      auth: basicAuth('unknown', 'test-only-secret'),
      body: 'grant_type=client_credentials',
      status: 401,
      error: 'invalid_client',
    },
    {
      name: 'missing authentication',
      auth: '',
      body: 'grant_type=client_credentials',
      status: 401,
      error: 'invalid_client',
    },
    {
      name: 'invalid Basic',
      auth: 'Basic !!!',
      body: 'grant_type=client_credentials',
      status: 401,
      error: 'invalid_client',
    },
    {
      name: 'invalid credential encoding',
      auth: `Basic ${Buffer.from('%ZZ:secret').toString('base64')}`,
      body: 'grant_type=client_credentials',
      status: 401,
      error: 'invalid_client',
    },
    {
      name: 'missing grant',
      body: 'scope=catalog%3Aread',
      status: 400,
      error: 'invalid_request',
    },
    {
      name: 'duplicate grant',
      body: 'grant_type=client_credentials&grant_type=client_credentials',
      status: 400,
      error: 'invalid_request',
    },
    {
      name: 'duplicate scope',
      body: 'grant_type=client_credentials&scope=catalog%3Aread&scope=reports%3Aread',
      status: 400,
      error: 'invalid_request',
    },
    {
      name: 'two auth methods',
      body: 'grant_type=client_credentials&client_id=another&client_secret=other',
      status: 400,
      error: 'invalid_request',
    },
    {
      name: 'JSON body',
      type: 'application/json',
      body: '{"grant_type":"client_credentials"}',
      status: 400,
      error: 'invalid_request',
    },
    {
      name: 'unsupported grant',
      body: 'grant_type=password',
      status: 400,
      error: 'unsupported_grant_type',
    },
    {
      name: 'unknown scope',
      body: 'grant_type=client_credentials&scope=catalog%3Adelete',
      status: 400,
      error: 'invalid_scope',
    },
    {
      name: 'case-sensitive scope',
      body: 'grant_type=client_credentials&scope=Catalog%3Aread',
      status: 400,
      error: 'invalid_scope',
    },
    {
      name: 'malformed scope',
      body: 'grant_type=client_credentials&scope=catalog%3Aread%20%20reports%3Aread',
      status: 400,
      error: 'invalid_scope',
    },
    {
      name: 'oversized body',
      body: `grant_type=client_credentials&padding=${'x'.repeat(2500)}`,
      status: 400,
      error: 'invalid_request',
    },
  ];
  for (const entry of cases) {
    await t.test(entry.name, async () => {
      const response = await fetch(`${server.url}/token`, {
        method: 'POST',
        headers: {
          authorization: entry.auth ?? validAuth,
          'content-type': entry.type ?? 'application/x-www-form-urlencoded',
        },
        body: entry.body,
      });
      assert.equal(response.status, entry.status);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('pragma'), 'no-cache');
      assert.deepEqual(await response.json(), { error: entry.error });
      if (entry.status === 401) {
        assert.equal(
          response.headers.get('www-authenticate'),
          'Basic realm="lab01-token"',
        );
      }
    });
  }
});

await test('default scope, multiple scopes, and form-encoded Basic credentials', async (t) => {
  const keys = await generateKeyPair('RS256');
  const id = 'client :+ä';
  const secret = 'secret :+%ä&=123456789';
  const server = await listen(
    createAuthorizationServer({
      clientId: id,
      clientSecret: secret,
      allowedScopes,
      defaultScope: 'catalog:read',
      issuer: 'http://127.0.0.1:9000',
      audience,
      privateKey: keys.privateKey,
      tokenLifetimeSeconds: 60,
    }),
  );
  t.after(server.close);
  for (const scope of [undefined, 'reports:read catalog:read reports:read']) {
    const body = new URLSearchParams({ grant_type: 'client_credentials' });
    if (scope !== undefined) {
      body.set('scope', scope);
    }
    const response = await fetch(`${server.url}/token`, {
      method: 'POST',
      headers: { authorization: basicAuth(id, secret) },
      body,
    });
    assert.equal(response.status, 200);
    const json: unknown = await response.json();
    assert.ok(isRecord(json) && typeof json.access_token === 'string');
    assert.equal(
      json.scope,
      scope === undefined ? 'catalog:read' : 'reports:read catalog:read',
    );
    const { payload } = await jwtVerify(json.access_token, keys.publicKey);
    assert.equal(payload.scope, json.scope);
  }
});

await test('the token endpoint limits attempts and returns Retry-After', async (t) => {
  const keys = await generateKeyPair('RS256');
  let nowMs = Date.now();
  const config: AuthorizationConfig = {
    clientId,
    clientSecret: 'test-only-secret',
    allowedScopes,
    defaultScope: 'catalog:read',
    issuer: 'http://127.0.0.1:9000',
    audience,
    privateKey: keys.privateKey,
    tokenLifetimeSeconds: 60,
    rateLimit: { maxRequests: 2, windowMs: 10_000 },
    now: () => nowMs,
  };
  const server = await listen(createAuthorizationServer(config));
  t.after(server.close);
  const request = (): Promise<Response> =>
    fetch(`${server.url}/token`, {
      method: 'POST',
      headers: { authorization: basicAuth(clientId, 'wrong') },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
    });
  assert.equal((await request()).status, 401);
  assert.equal((await request()).status, 401);
  const limited = await request();
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '10');
  assert.deepEqual(await limited.json(), { error: 'rate_limited' });
  nowMs += 10_000;
  assert.equal((await request()).status, 401);
});

await test('registration limits permissions; incorrect methods and query parameters are rejected', async (t) => {
  const keys = await generateKeyPair('RS256');
  const server = await listen(
    createAuthorizationServer({
      clientId,
      clientSecret: 'test-only-secret',
      allowedScopes: ['catalog:read'],
      defaultScope: 'catalog:read',
      issuer: 'http://127.0.0.1:9000',
      audience,
      privateKey: keys.privateKey,
      tokenLifetimeSeconds: 60,
    }),
  );
  t.after(server.close);
  const headers = { authorization: basicAuth(clientId, 'test-only-secret') };
  const denied = await fetch(`${server.url}/token`, {
    method: 'POST',
    headers,
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'reports:read',
    }),
  });
  assert.equal(denied.status, 400);
  assert.deepEqual(await denied.json(), { error: 'invalid_scope' });
  const get = await fetch(`${server.url}/token`, { headers });
  assert.equal(get.status, 405);
  assert.equal(get.headers.get('allow'), 'POST');
  const query = await fetch(`${server.url}/token?scope=reports%3Aread`, {
    method: 'POST',
    headers,
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });
  assert.equal(query.status, 400);
  assert.deepEqual(await query.json(), { error: 'invalid_request' });
});
