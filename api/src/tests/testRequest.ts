import http from 'http';
import type { RequestListener } from 'http';
import supertest from 'supertest';

// Serves `app` from a server bound to 127.0.0.1 and returns a supertest agent
// for it: `const api = await serve(app); await api.get('/x')`.
//
// supertest's own throwaway servers bind the wildcard address, which on macOS
// can share a port with another app's 127.0.0.1 listener (a dev tool, a local
// proxy); the request then reaches that app and comes back as a stray
// 401/404/405 or "socket hang up". A 127.0.0.1 bind can never be handed a port
// that is already taken there.
//
// The server must already be listening: supertest calls listen(0) itself when
// address() is null, which would silently bring the wildcard bind back.
export async function serve(app: RequestListener) {
  const server = http.createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  server.unref(); // never keep the test process alive
  return Object.assign(supertest(server), { address: () => server.address() });
}
