import { describe, it, expect } from 'vitest';
import express from 'express';
import { AppError, ErrorHandler } from '../middleware/errorHandler';
import { serve } from './testRequest';
import { Prisma } from '../../dist/generated/prisma';

function appWithRoute(handler: express.RequestHandler) {
  const app = express();
  app.use(express.json());
  app.post('/x', handler);
  app.use(ErrorHandler);
  return serve(app);
}

describe('ErrorHandler', () => {
  it('a malformed JSON body is a 400, not a 500 (body-parser SyntaxError, thrown before our own routes run)', async () => {
    const api = await appWithRoute((_req, res) => res.json({ ok: true }));
    const res = await api
      .post('/x')
      .set('Content-Type', 'application/json')
      .send('{not valid json');
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toMatch(/malformed json/i);
  });

  it('still uses AppError.statusCode/code/details as before (no regression)', async () => {
    const api = await appWithRoute(() => {
      throw new AppError(422, 'nope', 'SOME_CODE', undefined, { extra: 1 });
    });
    const res = await api.post('/x').send({});
    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      status: 'error',
      code: 'SOME_CODE',
      message: 'nope',
      extra: 1,
    });
  });

  it('respects a plain (non-AppError) error carrying a 4xx status/statusCode', async () => {
    const api = await appWithRoute(() => {
      const err = Object.assign(new Error('bad input'), { status: 400 });
      throw err;
    });
    const res = await api.post('/x').send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ status: 'error', message: 'bad input' });
  });

  it('never surfaces a non-AppError 5xx (or missing) status as anything but a generic 500', async () => {
    const api = await appWithRoute(() => {
      throw new Error('something internal broke');
    });
    const res = await api.post('/x').send({});
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      status: 'error',
      message: 'Internal server error',
    });

    const api2 = await appWithRoute(() => {
      const err = Object.assign(new Error('weird'), { statusCode: 503 });
      throw err;
    });
    const res2 = await api2.post('/x').send({});
    expect(res2.status).toBe(500);
    expect(res2.body.message).toBe('Internal server error');
  });
});

describe('ErrorHandler: foreign-key violations', () => {
  it('an unhandled Prisma P2003 is a 409 CONFLICT_REFERENCED with a generic message, not a 500', async () => {
    const api = await appWithRoute(() => {
      throw new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint violated on the constraint: `Booking_serviceId_fkey`',
        { code: 'P2003', clientVersion: 'test' },
      );
    });
    const res = await api.post('/x').send({});
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT_REFERENCED');
    expect(res.body.message).not.toMatch(/Booking_serviceId_fkey|constraint/i);
  });

  it('other Prisma errors are still a generic 500', async () => {
    const api = await appWithRoute(() => {
      throw new Prisma.PrismaClientKnownRequestError('boom', {
        code: 'P2025',
        clientVersion: 'test',
      });
    });
    expect((await api.post('/x').send({})).status).toBe(500);
  });
});
