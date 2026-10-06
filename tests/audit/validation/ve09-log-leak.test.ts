import app from '../../../api/src/app';
import { serve } from '../../../api/src/tests/testRequest';
import { unique } from '../../../api/src/tests/helpers';
import { logger } from '../../../api/src/utils/logger';

vi.mock('../../../api/src/services/email.service');

const api = await serve(app);

// errorHandler.ts:76 logs the whole error. A PrismaClientValidationError's
// message embeds the query arguments, so a request that trips one (VE-02)
// writes the row being created to the log.
describe('VE-09: error logs must not carry credentials or PII', () => {
  it('VE-09: a failed register does not log the password hash or the email', async () => {
    const spy = vi.spyOn(logger, 'error');
    const email = `leak${unique()}@example.com`;
    await api.post('/auth/register').send({
      email,
      name: ['N'],
      password: 'Abcdef1!x',
      acceptTerms: true,
    });
    const logged = spy.mock.calls
      .map(([first]) => {
        const err = (first as { err?: Error })?.err;
        return `${err?.message ?? ''} ${err?.stack ?? ''}`;
      })
      .join('\n');
    spy.mockRestore();
    expect(logged).not.toContain('$2b$');
    expect(logged).not.toContain(email);
  });
});
