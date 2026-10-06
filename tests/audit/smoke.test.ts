import app from '../../api/src/app';
import { serve } from '../../api/src/tests/testRequest';
import { createTenant, authHeader } from '../../api/src/tests/helpers';

describe('audit harness smoke', () => {
  it('boots the app and reaches the DB', async () => {
    const api = await serve(app);
    const t = await createTenant('Smoke');
    const res = await api.get(`/api/shops/${t.shop.id}`).set(authHeader(t.token));
    expect(res.status).toBe(200);
  });
});
