import { fork } from 'node:child_process';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { TestProject } from 'vitest/node';
import { backendFixtureSchema } from './context.ts';

export default async function setup(project: TestProject) {
  const backendPath = resolve(
    process.env.BACKEND_TEMPLATE_PATH ?? '../backend-template',
  );
  const serverPath = resolve(backendPath, 'test/frontend/server.ts');

  try {
    await access(serverPath);
  } catch {
    throw new Error(
      'Set BACKEND_TEMPLATE_PATH to a backend-template checkout containing test/frontend/server.ts, and install its dependencies with npm ci.',
    );
  }

  const backend = fork(serverPath, {
    cwd: backendPath,
    execArgv: ['--require', 'ts-node/register'],
    env: {
      ...process.env,
      TS_NODE_PROJECT: resolve(backendPath, 'test/frontend/tsconfig.json'),
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  let output = '';
  const captureOutput = (chunk: Buffer) => {
    output = `${output}${chunk.toString()}`.slice(-12_000);
  };

  backend.stdout?.on('data', captureOutput);
  backend.stderr?.on('data', captureOutput);

  const teardown = async () => {
    if (
      backend.pid === undefined ||
      backend.exitCode !== null ||
      backend.signalCode !== null
    ) {
      return;
    }

    const exited = new Promise<void>((resolveExit) => {
      backend.once('exit', () => resolveExit());
    });

    if (backend.connected) {
      backend.disconnect();
    } else {
      backend.kill('SIGTERM');
    }

    const timer = setTimeout(() => backend.kill('SIGKILL'), 15_000);

    try {
      await exited;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    const fixture = await new Promise<
      ReturnType<typeof backendFixtureSchema.parse>
    >((resolveReady, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Backend fixture startup timed out.\n${output}`));
      }, 120_000);

      backend.once('message', (message: unknown) => {
        clearTimeout(timer);
        const result = backendFixtureSchema.safeParse(message);

        if (result.success) {
          resolveReady(result.data);
        } else {
          reject(
            new Error('The backend fixture returned an invalid ready message.'),
          );
        }
      });
      backend.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      backend.once('exit', (code, signal) => {
        clearTimeout(timer);
        reject(
          new Error(
            `Backend fixture exited before startup (${code ?? signal}).\n${output}`,
          ),
        );
      });
    });

    project.provide('backend', fixture);

    return teardown;
  } catch (error) {
    await teardown();
    throw error;
  }
}
