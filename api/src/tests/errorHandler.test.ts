import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { AppError, ErrorHandler } from '../middleware/errorHandler';

function appWithRoute(handler: express.RequestHandler) {
  const app = express();
  app.use(express.json());
  app.post('/x', handler);
  app.use(ErrorHandler);
  return app;
}

describe('ErrorHandler', () => {
  it('a malformed JSON body is a 400, not a 500 (body-parser SyntaxError, thrown before our own routes run)', async () => {
    const app = appWithRoute((_req, res) => res.json({ ok: true }));
    const res = await request(app)
      .post('/x')
      .set('Content-Type', 'application/json')
      .send('{not valid json');
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toMatch(/malformed json/i);
  });

  it('still uses AppError.statusCode/code/details as before (no regression)', async () => {
    const app = appWithRoute(() => {
      throw new AppError(422, 'nope', 'SOME_CODE', undefined, { extra: 1 });
    });
    const res = await request(app).post('/x').send({});
    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      status: 'error',
      code: 'SOME_CODE',
      message: 'nope',
      extra: 1,
    });
  });

  it('respects a plain (non-AppError) error carrying a 4xx status/statusCode', async () => {
    const app = appWithRoute(() => {
      const err = Object.assign(new Error('bad input'), { status: 400 });
      throw err;
    });
    const res = await request(app).post('/x').send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ status: 'error', message: 'bad input' });
  });

  it('never surfaces a non-AppError 5xx (or missing) status as anything but a generic 500', async () => {
    const app = appWithRoute(() => {
      throw new Error('something internal broke');
    });
    const res = await request(app).post('/x').send({});
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      status: 'error',
      message: 'Internal server error',
    });

    const app2 = appWithRoute(() => {
      const err = Object.assign(new Error('weird'), { statusCode: 503 });
      throw err;
    });
    const res2 = await request(app2).post('/x').send({});
    expect(res2.status).toBe(500);
    expect(res2.body.message).toBe('Internal server error');
  });
});
