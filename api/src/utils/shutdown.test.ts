import { describe, it, expect, vi } from 'vitest';
import { createShutdown } from './shutdown';

const setup = (over: Partial<Parameters<typeof createShutdown>[0]> = {}) => {
  const calls: string[] = [];
  const deps = {
    server: {
      close: vi.fn((cb?: (err?: Error) => void) => {
        calls.push('close');
        cb?.();
      }),
    },
    disconnect: vi.fn(async () => {
      calls.push('disconnect');
    }),
    onShutdown: vi.fn(() => calls.push('onShutdown')),
    log: { info: vi.fn(), error: vi.fn() },
    exit: vi.fn(),
    ...over,
  } as Parameters<typeof createShutdown>[0];
  return { deps, calls, shutdown: createShutdown(deps) };
};

describe('createShutdown', () => {
  it('stops timers, closes the server, then disconnects the DB, then exits 0', async () => {
    const { shutdown, calls, deps } = setup();
    await shutdown('SIGTERM');
    expect(calls).toEqual(['onShutdown', 'close', 'disconnect']);
    expect(deps.exit).toHaveBeenCalledExactlyOnceWith(0);
  });

  it('exits with the given code', async () => {
    const { shutdown, deps } = setup();
    await shutdown('unhandledRejection', 1);
    expect(deps.exit).toHaveBeenCalledWith(1);
  });

  it('runs only once when signalled repeatedly', async () => {
    const { shutdown, deps } = setup();
    await Promise.all([shutdown('SIGTERM'), shutdown('SIGINT')]);
    expect(deps.server.close).toHaveBeenCalledTimes(1);
    expect(deps.exit).toHaveBeenCalledTimes(1);
  });

  it('exits 1 if closing fails', async () => {
    const { shutdown, deps } = setup({
      server: {
        close: (cb?: (err?: Error) => void) => cb?.(new Error('boom')),
      },
    } as never);
    await shutdown('SIGTERM');
    expect(deps.exit).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('force-exits 1 if in-flight connections never drain', async () => {
    vi.useFakeTimers();
    const { shutdown, deps } = setup({
      server: { close: () => undefined }, // never calls back
      timeoutMs: 50,
    } as never);
    void shutdown('SIGTERM');
    await vi.advanceTimersByTimeAsync(60);
    expect(deps.exit).toHaveBeenCalledExactlyOnceWith(1);
    vi.useRealTimers();
  });
});
