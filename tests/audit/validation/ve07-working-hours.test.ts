import app from '../../../api/src/app';
import { serve } from '../../../api/src/tests/testRequest';
import {
  createTenant,
  authHeader,
  addWeeklySchedule,
} from '../../../api/src/tests/helpers';

const api = await serve(app);

// workingHours.validator.ts:4 TIME_REGEX is /^\d{2}:\d{2}$/ (timeOff.validator.ts:4
// has the strict form), and nothing checks start < end or repeated days.
describe('VE-07: working-hour ranges are validated by shape only', () => {
  const put = async (days: unknown) => {
    const t = await createTenant('Wh');
    const sched = await addWeeklySchedule(t);
    return api
      .put(`/api/shops/${t.shop.id}/team/${t.staff.id}/schedules/${sched.id}/days`)
      .set(authHeader(t.token))
      .send({ days });
  };

  it('VE-07: an impossible clock time (99:99) is rejected', async () => {
    const res = await put([
      { day: 'MON', isOpen: true, hours: [{ startTime: '99:99', endTime: '99:99' }] },
    ]);
    expect(res.status).toBe(400);
  });

  it('VE-07: a range that ends before it starts is rejected', async () => {
    const res = await put([
      { day: 'MON', isOpen: true, hours: [{ startTime: '18:00', endTime: '09:00' }] },
    ]);
    expect(res.status).toBe(400);
  });

  it('VE-07: the same day sent twice is a 400, not a 500', async () => {
    const day = { day: 'MON', isOpen: true, hours: [{ startTime: '09:00', endTime: '12:00' }] };
    const t = await createTenant('Wh');
    const res = await api
      .post(`/api/shops/${t.shop.id}/team/${t.staff.id}/schedules`)
      .set(authHeader(t.token))
      .send({ startDate: '2027-01-01', days: [day, day] });
    expect(res.status).toBe(400);
  });
});
