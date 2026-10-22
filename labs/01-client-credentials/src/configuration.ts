import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { importPKCS8, importSPKI } from 'jose';
import type { CryptoKey } from 'jose';
import { isRecord, parseScope } from './contracts.js';

export interface ClientCredentials {
  clientId: string;
  clientSecret: string;
}

export interface Registration extends ClientCredentials {
  allowedScopes: string[];
  defaultScope: string;
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}

function credentials(value: unknown): ClientCredentials {
  if (
    !isRecord(value) ||
    typeof value.clientId !== 'string' ||
    !value.clientId ||
    value.clientId.length > 256 ||
    typeof value.clientSecret !== 'string' ||
    value.clientSecret.length < 16 ||
    value.clientSecret.length > 256
  ) {
    throw new Error('Invalid local client configuration.');
  }
  return { clientId: value.clientId, clientSecret: value.clientSecret };
}

export async function loadClient(
  directory: string,
): Promise<ClientCredentials> {
  return credentials(await readJson(join(directory, 'client.json')));
}

export async function loadRegistration(
  directory: string,
): Promise<Registration> {
  const value = await readJson(join(directory, 'registration.json'));
  const client = credentials(value);
  if (
    !isRecord(value) ||
    !Array.isArray(value.allowedScopes) ||
    !value.allowedScopes.every(
      (scope: unknown): scope is string =>
        typeof scope === 'string' && parseScope(scope)?.length === 1,
    ) ||
    value.allowedScopes.length === 0 ||
    typeof value.defaultScope !== 'string'
  ) {
    throw new Error('Invalid local scope configuration.');
  }
  const allowedScopes = value.allowedScopes;
  const defaults = parseScope(value.defaultScope);
  if (!defaults || !defaults.every((scope) => allowedScopes.includes(scope))) {
    throw new Error('Default scope is not registered.');
  }
  return { ...client, allowedScopes, defaultScope: value.defaultScope };
}

export async function loadPrivateKey(directory: string): Promise<CryptoKey> {
  return importPKCS8(
    await readFile(join(directory, 'private-key.pem'), 'utf8'),
    'RS256',
  );
}

export async function loadPublicKey(directory: string): Promise<CryptoKey> {
  return importSPKI(
    await readFile(join(directory, 'public-key.pem'), 'utf8'),
    'RS256',
  );
}
