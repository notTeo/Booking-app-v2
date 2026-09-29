import type { Server } from 'http';

interface ShutdownDeps {
  server: Pick<Server, 'close'>;
  disconnect: () => Promise<void>;
  onShutdown?: () => void;
  log: {
    info: (msg: string) => void;
    error: (obj: unknown, msg: string) => void;
  };
  exit: (code: number) => void;
  timeoutMs?: number;
}

// Stop accepting connections, let in-flight requests finish, close the DB
// pool, then exit. A hard timeout guarantees the process still dies if a
// keep-alive connection or a stuck query never drains (Railway sends SIGKILL
// ~30s after SIGTERM anyway; we exit first, cleanly).
export const createShutdown = (deps: ShutdownDeps) => {
  let started = false;
  const {
    server,
    disconnect,
    onShutdown,
    log,
    exit,
    timeoutMs = 10_000,
  } = deps;

  return async (reason: string, code = 0) => {
    if (started) return;
    started = true;
    log.info(`Shutting down (${reason})`);

    const timer = setTimeout(() => {
      log.error({ reason }, 'Shutdown timed out, forcing exit');
      exit(1);
    }, timeoutMs);
    timer.unref();

    try {
      onShutdown?.();
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
      await disconnect();
      clearTimeout(timer);
      log.info('Shutdown complete');
      exit(code);
    } catch (err) {
      clearTimeout(timer);
      log.error(err, 'Error during shutdown');
      exit(1);
    }
  };
};
