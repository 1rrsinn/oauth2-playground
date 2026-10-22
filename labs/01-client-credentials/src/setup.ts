import { randomBytes } from 'node:crypto';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { exportPKCS8, exportSPKI, generateKeyPair } from 'jose';
import { allowedScopes, clientId } from './contracts.js';
import { dataDirectory, isMain } from './runtime.js';

const fileNames = [
  'client.json',
  'registration.json',
  'private-key.pem',
  'public-key.pem',
];

export async function setup(
  directory: string,
  reset = false,
): Promise<'created' | 'preserved'> {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const existing = await readdir(directory);
  const count = fileNames.filter((name) => existing.includes(name)).length;
  if (!reset && count === fileNames.length) {
    return 'preserved';
  }
  if (!reset && count > 0) {
    throw new Error(
      'Incomplete setup. Use --reset to regenerate it explicitly.',
    );
  }
  const client = {
    clientId,
    clientSecret: randomBytes(32).toString('base64url'),
  };
  const keys = await generateKeyPair('RS256', {
    extractable: true,
    modulusLength: 2048,
  });
  const files: Record<string, string> = {
    'client.json': JSON.stringify(client, null, 2) + '\n',
    'registration.json':
      JSON.stringify(
        { ...client, allowedScopes, defaultScope: 'catalog:read' },
        null,
        2,
      ) + '\n',
    'private-key.pem': await exportPKCS8(keys.privateKey),
    'public-key.pem': await exportSPKI(keys.publicKey),
  };
  // --reset only replaces these four named files. No recursive delete or other data removal.
  for (const name of fileNames) {
    const content = files[name];
    if (content === undefined) {
      throw new Error('Setup file is missing.');
    }
    await writeFile(join(directory, name), content, {
      mode: 0o600,
      flag: reset ? 'w' : 'wx',
    });
  }
  return 'created';
}

if (isMain(import.meta.url)) {
  try {
    if (process.argv.slice(2).some((arg) => arg !== '--reset')) {
      throw new Error('Allowed option: --reset');
    }
    const result = await setup(
      dataDirectory(),
      process.argv.includes('--reset'),
    );
    console.log(
      result === 'created'
        ? 'Created local keys and client credentials.'
        : 'Preserved existing local configuration.',
    );
  } catch {
    console.error(
      'Setup failed. Check the local data directory; --reset replaces the four lab configuration files.',
    );
    process.exitCode = 1;
  }
}
