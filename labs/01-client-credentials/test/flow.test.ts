import assert from 'node:assert/strict';
import { test } from 'node:test';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadClient } from '../src/configuration.js';
import { isRecord } from '../src/contracts.js';
import { basicAuth } from './support.js';
import { freeUrl, launch, temporaryData } from './process-support.js';

await test('three separate processes: scope decisions and offline validation after stopping the AS', async (t) => {
  const directory = await temporaryData(t);
  const asUrl = await freeUrl();
  const rsUrl = await freeUrl();
  const env = { LAB_DATA_DIR: directory, LAB_AS_URL: asUrl, LAB_RS_URL: rsUrl };
  const initial = await launch('setup.js', env).result;
  assert.equal(initial.code, 0);
  const original = await readFile(join(directory, 'client.json'), 'utf8');
  assert.equal((await launch('setup.js', env).result).code, 0);
  assert.equal(
    await readFile(join(directory, 'client.json'), 'utf8'),
    original,
  );
  // Give each process only its own files. In particular the RS has no secret/private key.
  for (const [role, files] of Object.entries({
    as: ['registration.json', 'private-key.pem'],
    rs: ['public-key.pem'],
    client: ['client.json'],
  })) {
    await mkdir(join(directory, role));
    for (const file of files) {
      await copyFile(join(directory, file), join(directory, role, file));
    }
  }
  const as = launch('authorization-server.js', {
    ...env,
    LAB_DATA_DIR: join(directory, 'as'),
  });
  const rs = launch('resource-server.js', {
    ...env,
    LAB_DATA_DIR: join(directory, 'rs'),
  });
  t.after(async () => {
    await as.stop();
    await rs.stop();
  });
  await Promise.all([as.ready(), rs.ready()]);
  for (const url of [asUrl, rsUrl]) {
    const response = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(1000),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  }
  const clientEnv = { ...env, LAB_DATA_DIR: join(directory, 'client') };
  const credentials = await loadClient(directory);
  const catalog = await launch('client.js', clientEnv).result;
  assert.equal(catalog.code, 0);
  assert.match(catalog.output, /API 200/);
  assert.match(catalog.output, /OAuth2 handbook/);
  assert.ok(
    !catalog.output.includes(credentials.clientSecret),
    'The client secret stays hidden',
  );
  const forbidden = await launch('client.js', clientEnv, [
    '--resource',
    'reports',
  ]).result;
  assert.equal(forbidden.code, 1);
  assert.match(forbidden.output, /403.*insufficient_scope/);
  const reports = await launch('client.js', clientEnv, [
    '--resource',
    'reports',
    '--scope',
    'reports:read',
  ]).result;
  assert.equal(reports.code, 0);
  assert.match(reports.output, /API 200/);
  assert.match(reports.output, /report-01/);
  const invalidScope = await launch('client.js', clientEnv, [
    '--scope',
    'catalog:delete',
  ]).result;
  assert.equal(invalidScope.code, 1);
  assert.match(invalidScope.output, /400.*invalid_scope/);
  const tokenResponse = await fetch(`${asUrl}/token`, {
    method: 'POST',
    headers: {
      authorization: basicAuth(credentials.clientId, credentials.clientSecret),
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
    signal: AbortSignal.timeout(1000),
  });
  assert.equal(tokenResponse.status, 200);
  const token: unknown = await tokenResponse.json();
  assert.ok(isRecord(token) && typeof token.access_token === 'string');
  await as.stop();
  const offline = await fetch(`${rsUrl}/api/catalog`, {
    headers: { authorization: `Bearer ${token.access_token}` },
    signal: AbortSignal.timeout(1000),
  });
  assert.equal(offline.status, 200);
  const noAs = await launch('client.js', clientEnv, ['--timeout-ms', '300'])
    .result;
  assert.equal(noAs.code, 1);
  assert.match(noAs.output, /network error, timeout, or redirect/);
  assert.ok(!noAs.output.includes(credentials.clientSecret));
  assert.ok(!noAs.output.includes(token.access_token));
});
