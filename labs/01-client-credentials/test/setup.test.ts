import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  loadClient,
  loadPrivateKey,
  loadPublicKey,
  loadRegistration,
} from '../src/configuration.js';
import { setup } from '../src/setup.js';
import { temporaryData } from './process-support.js';

await test('setup preserves existing data and rotates only on explicit reset', async (t) => {
  const directory = await temporaryData(t);
  assert.equal(await setup(directory), 'created');
  const original = await loadClient(directory);
  const publicKey = await readFile(join(directory, 'public-key.pem'), 'utf8');
  assert.equal(await setup(directory), 'preserved');
  assert.deepEqual(await loadClient(directory), original);
  assert.equal(
    await readFile(join(directory, 'public-key.pem'), 'utf8'),
    publicKey,
  );
  await writeFile(join(directory, 'keep.txt'), 'other local material');
  assert.equal(await setup(directory, true), 'created');
  assert.notEqual(
    (await loadClient(directory)).clientSecret,
    original.clientSecret,
  );
  assert.notEqual(
    await readFile(join(directory, 'public-key.pem'), 'utf8'),
    publicKey,
  );
  assert.equal(
    await readFile(join(directory, 'keep.txt'), 'utf8'),
    'other local material',
  );
  assert.equal((await loadPrivateKey(directory)).type, 'private');
  assert.equal((await loadPublicKey(directory)).type, 'public');
  assert.deepEqual((await loadRegistration(directory)).allowedScopes, [
    'catalog:read',
    'reports:read',
  ]);
});

await test('incomplete setup is preserved; invalid configuration is rejected', async (t) => {
  const directory = await temporaryData(t);
  await writeFile(join(directory, 'client.json'), '{}');
  await assert.rejects(setup(directory), /Incomplete setup/);
  assert.equal(await readFile(join(directory, 'client.json'), 'utf8'), '{}');
  await assert.rejects(
    loadClient(directory),
    /Invalid local client configuration/,
  );
  await setup(directory, true);
  const registration = await loadRegistration(directory);
  await writeFile(
    join(directory, 'registration.json'),
    JSON.stringify({ ...registration, defaultScope: 'admin:all' }),
  );
  await assert.rejects(
    loadRegistration(directory),
    /Default scope is not registered/,
  );
});
