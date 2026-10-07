import app from '../../../api/src/app';
import { serve } from '../../../api/src/tests/testRequest';

const api = await serve(app);

// app.ts:61-64 mounts express.json({ limit: '2mb' }) on the import path for
// every caller, ahead of `authenticate` (shop.routes.ts:130-135). An anonymous
// request gets 20x the normal body allowance parsed before it is refused.
describe('VE-08: the 2mb import body limit applies before authentication', () => {
  it('VE-08: an anonymous 1.5 MB body is refused without being parsed', async () => {
    const res = await api
      .post('/api/shops/anything/customers/import')
      .set('Content-Type', 'application/json')
      .send('{"rows":[' + '"x",'.repeat(375000) + ']'); // malformed on purpose
    // 401 (auth first) or 413 (default limit) are both fine. A 400
    // "Malformed JSON" shows the whole body was read and parsed.
    expect([401, 413]).toContain(res.status);
  });
});
