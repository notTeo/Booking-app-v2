import { describe, it, expect } from 'vitest';
import http from 'http';
import net from 'net';
import express from 'express';
import { serve } from './testRequest';

// supertest's own throwaway servers bind the wildcard address. On macOS that
// can share a port with another app's 127.0.0.1 listener, and the request then
// reaches that app (a 401/404/405 or "socket hang up" that never touched ours).
// Test servers must bind 127.0.0.1 so the OS never hands out a taken port.
describe('serve', () => {
  it('serves the app from a server bound to 127.0.0.1', async () => {
    const app = express();
    app.get('/x', (_req, res) => res.json({ ok: true }));

    const api = await serve(app);
    const res = await api.get('/x');

    expect((api.address() as net.AddressInfo).address).toBe('127.0.0.1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('keeps serving across many requests on the same server', async () => {
    const app = express();
    app.get('/x', (_req, res) => res.json({ ok: true }));
    const api = await serve(app);

    for (let i = 0; i < 50; i++) expect((await api.get('/x')).status).toBe(200);
  });

  it('cannot share a port with another app listening on 127.0.0.1', async () => {
    const foreign = http.createServer((_req, res) => res.end('foreign'));
    await new Promise<void>((ok) => foreign.listen(0, '127.0.0.1', ok));
    const { port } = foreign.address() as net.AddressInfo;
    try {
      const ours = http.createServer();
      const err = await new Promise<NodeJS.ErrnoException>((ok) => {
        ours.once('error', ok);
        ours.listen(port, '127.0.0.1');
      });
      expect(err.code).toBe('EADDRINUSE');
    } finally {
      foreign.close();
    }
  });
});
