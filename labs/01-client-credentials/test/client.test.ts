import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import express from 'express';
import { listen } from './support.js';
import { freeUrl, launch, temporaryData } from './process-support.js';

await test('the CLI rejects redirects, limits waiting, and redacts server errors', async (t) => {
  const directory = await temporaryData(t);
  const secret = randomBytes(32).toString('base64url') + '":\\\n';
  const token = randomBytes(32).toString('base64url');
  await writeFile(
    join(directory, 'client.json'),
    JSON.stringify({ clientId: 'lab01-client', clientSecret: secret }),
  );
  const app = express();
  let mode = 'token-redirect';
  let redirectedRequests = 0;
  app.post('/token', (_request, response) => {
    switch (mode) {
      case 'token-redirect':
        response.redirect(307, '/capture');
        return;
      case 'timeout':
        return; // Intentional nonresponding test server, closed by t.after.
      case 'error':
        response.status(401).json({
          error: 'invalid_client',
          error_description: `${secret} ${token}`,
          access_token: token,
        });
        return;
      case 'unknown-error':
        response.status(400).json({ error: `${secret} ${token}` });
        return;
      case 'malformed':
        response.json({
          access_token: token,
          token_type: 'Bearer',
          expires_in: '60',
          scope: 'catalog:read',
        });
        return;
      case 'not-json':
        response.send(`<html>${secret}</html>`);
        return;
      case 'oversized':
        response.json({ padding: 'x'.repeat(20_000), client_secret: secret });
        return;
      default:
        response.json({
          access_token: token,
          token_type: 'Bearer',
          expires_in: 60,
          scope: 'catalog:read',
        });
    }
  });
  app.get('/api/catalog', (_request, response) => {
    if (mode === 'api-redirect') {
      response.redirect(307, '/capture');
      return;
    }
    response.json({
      items: [{ id: 'book-01', name: `${secret} ${token}` }],
      access_token: token,
    });
  });
  app.all('/capture', (_request, response) => {
    redirectedRequests += 1;
    response.json({});
  });
  const server = await listen(app);
  t.after(server.close);
  const env = {
    LAB_DATA_DIR: directory,
    LAB_AS_URL: server.url,
    LAB_RS_URL: server.url,
  };
  const cases = [
    {
      mode: 'token-redirect',
      pattern: /Token endpoint: network error, timeout, or redirect/,
    },
    {
      mode: 'api-redirect',
      pattern: /Resource Server: network error, timeout, or redirect/,
    },
    { mode: 'timeout', pattern: /network error, timeout, or redirect/ },
    { mode: 'error', pattern: /401.*invalid_client/ },
    { mode: 'unknown-error', pattern: /400.*unknown error/ },
    { mode: 'malformed', pattern: /invalid response format/ },
    { mode: 'not-json', pattern: /invalid JSON response/ },
    { mode: 'oversized', pattern: /size limit/ },
  ];
  for (const entry of cases) {
    await t.test(entry.mode, async () => {
      mode = entry.mode;
      const startMs = Date.now();
      const result = await launch('client.js', env, ['--timeout-ms', '200'])
        .result;
      assert.equal(result.code, 1);
      assert.match(result.output, entry.pattern);
      assert.ok(
        Date.now() - startMs < 5000,
        'The client must fail within a bounded time',
      );
      assert.ok(!result.output.includes(secret), 'The secret is not printed');
      assert.ok(!result.output.includes(token), 'The token is not printed');
      assert.equal(
        redirectedRequests,
        0,
        'Credentials must not follow redirects',
      );
    });
  }
  mode = 'success-with-secret';
  const redacted = await launch('client.js', env).result;
  assert.equal(redacted.code, 0);
  assert.match(redacted.output, /REDACTED/);
  assert.ok(!redacted.output.includes(secret));
  assert.ok(
    !redacted.output.includes(JSON.stringify(secret).slice(1, -1)),
    'The JSON-escaped secret also stays hidden',
  );
  assert.ok(!redacted.output.includes(token));
  const unreachable = await launch('client.js', env, [
    '--as-url',
    await freeUrl(),
    '--timeout-ms',
    '200',
  ]).result;
  assert.equal(unreachable.code, 1);
  assert.match(unreachable.output, /network error, timeout, or redirect/);
});

await test('the CLI accepts only known options and local base URLs', async (t) => {
  const directory = await temporaryData(t);
  const env = { LAB_DATA_DIR: directory };
  const help = await launch('client.js', env, ['--help']).result;
  assert.equal(help.code, 0);
  assert.match(help.output, /--scope/);
  for (const args of [
    ['--as-url', 'http://example.com'],
    ['--rs-url', 'http://127.0.0.1:9001/other'],
    ['--as-url', 'http://user:password@127.0.0.1:9000'],
    ['--as-url', 'http://127.0.0.1:9000/?x=1'],
    ['--resource', 'users'],
    ['--timeout-ms', '0'],
    ['--scope'],
    ['--unknown', 'value'],
    ['--resource', 'catalog', '--resource', 'reports'],
  ]) {
    const result = await launch('client.js', env, args).result;
    assert.equal(result.code, 1);
    assert.ok(!result.output.includes('password'));
  }
});
