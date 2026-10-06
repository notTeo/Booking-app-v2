import app from '../../../api/src/app';
import { serve } from '../../../api/src/tests/testRequest';
import { createTenant, authHeader, unique } from '../../../api/src/tests/helpers';
import { prisma } from '../../../api/src/utils/prisma';

vi.mock('../../../api/src/services/email.service');

const api = await serve(app);

// team.validator.ts:51 accepts "false" (isBoolean, no strict / toBoolean) but
// team.service.ts:125,157 and the validator's own custom rule (:37) compare
// with `!== false`, so the string means "send the invite".
describe('VE-06: sendEmail must be a real boolean', () => {
  it('VE-06: sendEmail "false" does not create a login invite', async () => {
    const t = await createTenant('Se');
    const res = await api
      .post(`/api/shops/${t.shop.id}/team`)
      .set(authHeader(t.token))
      .send({ name: 'M', email: `m${unique()}@example.com`, role: 'staff', sendEmail: 'false' });
    const invites = await prisma.shopInvite.count({ where: { shopId: t.shop.id } });
    // Correct outcomes: rejected as a 400, or honoured as false.
    expect(res.status === 400 || invites === 0).toBe(true);
  });
});
