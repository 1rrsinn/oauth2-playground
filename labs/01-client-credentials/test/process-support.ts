import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { TestContext } from 'node:test';
import { labDirectory } from '../src/runtime.js';

export interface ProcessResult {
  code: number | null;
  output: string;
}

export interface RunningProcess {
  result: Promise<ProcessResult>;
  ready: () => Promise<void>;
  stop: () => Promise<void>;
}

export function launch(
  file: string,
  env: NodeJS.ProcessEnv,
  args: string[] = [],
): RunningProcess {
  const child = spawn(
    process.execPath,
    [join(labDirectory, '.tmp/build/src', file), ...args],
    {
      cwd: labDirectory,
      env: { ...process.env, ...env },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let output = '';
  let ended = false;
  child.stdout.on('data', (data: Buffer) => {
    output += data.toString();
  });
  child.stderr.on('data', (data: Buffer) => {
    output += data.toString();
  });
  const timeout = setTimeout(() => {
    child.kill();
  }, 15_000);
  const result = new Promise<ProcessResult>((resolveResult, reject) => {
    child.once('error', reject);
    child.once('close', (code) => {
      ended = true;
      clearTimeout(timeout);
      resolveResult({ code, output });
    });
  });
  return {
    result,
    ready: async () => {
      for (let attempt = 0; attempt < 200; attempt += 1) {
        if (output.includes('ready:')) {
          return;
        }
        if (ended) {
          throw new Error(`Server startup failed: ${output}`);
        }
        await delay(20);
      }
      throw new Error('The server did not become ready in time.');
    },
    stop: async () => {
      if (!ended) {
        child.kill();
      }
      await result;
    },
  };
}

export async function freeUrl(): Promise<string> {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Missing port.');
  }
  await new Promise<void>((resolveClose, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolveClose();
      }
    });
  });
  return `http://127.0.0.1:${address.port}`;
}

export async function temporaryData(t: TestContext): Promise<string> {
  const root = resolve(labDirectory, '.tmp/test-data');
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(join(root, 'run-'));
  t.after(async () => {
    // Guard before recursive cleanup on Windows; only this test's mkdtemp result.
    if (!resolve(directory).startsWith(root + sep)) {
      throw new Error('Invalid test path.');
    }
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}
