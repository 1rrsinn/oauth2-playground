import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { generateKeyPair, SignJWT } from 'jose';
import type { CryptoKey, JWTPayload } from 'jose';
import { createResourceServer } from '../src/resource-server.js';
import { audience, clientId } from '../src/contracts.js';
import { listen } from './support.js';

const issuer = 'http://127.0.0.1:9000';
const nowSeconds = 1_800_000_000;
let keys: Awaited<ReturnType<typeof generateKeyPair>>;
before(async () => {
  keys = await generateKeyPair('RS256');
});

function claims(): JWTPayload {
  return {
    iss: issuer,
    aud: audience,
    sub: clientId,
    client_id: clientId,
    iat: nowSeconds,
    exp: nowSeconds + 60,
    jti: randomUUID(),
    scope: 'catalog:read',
  };
}

async function sign(
  payload = claims(),
  key?: CryptoKey,
  typ = 'at+jwt',
  alg = 'RS256',
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg, typ })
    .sign(key ?? keys.privateKey);
}

await test('the resource server accepts a valid token and distinguishes insufficient scope', async (t) => {
  const server = await listen(
    createResourceServer({
      publicKey: keys.publicKey,
      issuer,
      audience,
      now: () => nowSeconds * 1000,
    }),
  );
  t.after(server.close);
  const token = await sign();
  const response = await fetch(`${server.url}/api/catalog`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    items: [{ id: 'book-01', name: 'OAuth2 handbook' }],
  });
  const forbidden = await fetch(`${server.url}/api/reports`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(forbidden.status, 403);
  assert.deepEqual(await forbidden.json(), { error: 'insufficient_scope' });
  assert.equal(
    forbidden.headers.get('www-authenticate'),
    'Bearer realm="lab01-api", error="insufficient_scope", scope="reports:read"',
  );
});

await test('no Bearer token: challenge without invalid_token', async (t) => {
  const server = await listen(
    createResourceServer({ publicKey: keys.publicKey, issuer, audience }),
  );
  t.after(server.close);
  const response = await fetch(`${server.url}/api/catalog`);
  assert.equal(response.status, 401);
  assert.equal(
    response.headers.get('www-authenticate'),
    'Bearer realm="lab01-api"',
  );
  assert.deepEqual(await response.json(), { error: 'authentication_required' });
});

await test('correctly signed tokens with invalid required claims are rejected', async (t) => {
  const server = await listen(
    createResourceServer({
      publicKey: keys.publicKey,
      issuer,
      audience,
      now: () => nowSeconds * 1000,
    }),
  );
  t.after(server.close);
  const cases: { name: string; payload: JWTPayload; typ?: string }[] = [
    {
      name: 'issuer',
      payload: { ...claims(), iss: 'https://untrusted.invalid' },
    },
    { name: 'audience', payload: { ...claims(), aud: 'another-api' } },
    { name: 'type', payload: claims(), typ: 'JWT' },
    { name: 'expired', payload: { ...claims(), exp: nowSeconds - 1 } },
    { name: 'future nbf', payload: { ...claims(), nbf: nowSeconds + 5 } },
    { name: 'future iat', payload: { ...claims(), iat: nowSeconds + 5 } },
    { name: 'empty sub', payload: { ...claims(), sub: '' } },
    { name: 'client_id number', payload: { ...claims(), client_id: 123 } },
    { name: 'empty jti', payload: { ...claims(), jti: '' } },
    { name: 'scope array', payload: { ...claims(), scope: ['catalog:read'] } },
    {
      name: 'malformed scope',
      payload: { ...claims(), scope: 'catalog:read  reports:read' },
    },
  ];
  for (const name of [
    'iss',
    'aud',
    'sub',
    'client_id',
    'iat',
    'exp',
    'jti',
    'scope',
  ]) {
    const payload = claims();
    delete payload[name];
    cases.push({ name: `missing ${name}`, payload });
  }
  for (const entry of cases) {
    await t.test(entry.name, async () => {
      const token = await sign(entry.payload, undefined, entry.typ);
      const response = await fetch(`${server.url}/api/catalog`, {
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { error: 'invalid_token' });
      assert.equal(
        response.headers.get('www-authenticate'),
        'Bearer realm="lab01-api", error="invalid_token"',
      );
    });
  }
});

await test('tampering, incorrect key, incorrect algorithm, and malformed token', async (t) => {
  const server = await listen(
    createResourceServer({
      publicKey: keys.publicKey,
      issuer,
      audience,
      now: () => nowSeconds * 1000,
    }),
  );
  t.after(server.close);
  const other = await generateKeyPair('RS256');
  const token = await sign();
  const parts = token.split('.');
  const changed = Buffer.from(
    JSON.stringify({ ...claims(), scope: 'reports:read' }),
  ).toString('base64url');
  const psKeys = await generateKeyPair('PS256');
  const invalid = [
    `${parts[0]}.${changed}.${parts[2]}`,
    await sign(claims(), other.privateKey),
    await sign(claims(), psKeys.privateKey, 'at+jwt', 'PS256'),
    'broken',
  ];
  for (const value of invalid) {
    const response = await fetch(`${server.url}/api/catalog`, {
      headers: { authorization: `Bearer ${value}` },
    });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'invalid_token' });
  }
});

await test('scope checks use exact tokens; reports:read permits reports', async (t) => {
  const server = await listen(
    createResourceServer({
      publicKey: keys.publicKey,
      issuer,
      audience,
      now: () => nowSeconds * 1000,
    }),
  );
  t.after(server.close);
  for (const scope of ['catalog:read-extra', 'CATALOG:READ']) {
    const token = await sign({ ...claims(), scope });
    const response = await fetch(`${server.url}/api/catalog`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 403);
  }
  const token = await sign({ ...claims(), scope: 'reports:read' });
  const response = await fetch(`${server.url}/api/reports`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    reports: [{ id: 'report-01', total: 42 }],
  });
});

await test('expiry boundary without waiting; URL tokens are rejected', async (t) => {
  let currentSeconds = nowSeconds;
  const server = await listen(
    createResourceServer({
      publicKey: keys.publicKey,
      issuer,
      audience,
      now: () => currentSeconds * 1000,
    }),
  );
  t.after(server.close);
  const token = await sign();
  const request = (): Promise<Response> =>
    fetch(`${server.url}/api/catalog`, {
      headers: { authorization: `Bearer ${token}` },
    });
  currentSeconds = nowSeconds + 59;
  assert.equal((await request()).status, 200);
  currentSeconds = nowSeconds + 60;
  const expired = await request();
  assert.equal(expired.status, 401);
  assert.deepEqual(await expired.json(), { error: 'invalid_token' });
  const inUrl = await fetch(
    `${server.url}/api/catalog?access_token=placeholder`,
  );
  assert.equal(inUrl.status, 400);
  assert.deepEqual(await inUrl.json(), { error: 'invalid_request' });
});
