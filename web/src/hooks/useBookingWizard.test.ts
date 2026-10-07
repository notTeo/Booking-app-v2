import { describe, expect, it } from 'vitest';
import { lastSteps, nextStepBack, wizardServices } from './useBookingWizard';
import type { Service } from '../api/public.api';

const svc = (id: string): Service => ({ id, name: id, description: null, duration: 30, price: 1000 });

describe('nextStepBack (reschedule mode)', () => {
  it('walks 4 -> 3 -> 2 -> 1 for the owner wizard and never loops forward', () => {
    expect(nextStepBack(4, 1)).toBe(3);
    expect(nextStepBack(3, 1)).toBe(2);
    // The reported bug: Back on step 2 used to jump to step 3.
    expect(nextStepBack(2, 1)).toBe(1);
  });

  it('leaves the wizard from its first step', () => {
    expect(nextStepBack(1, 1)).toBeNull();
    // A customer reschedule has no service step: step 2 is the first one.
    expect(nextStepBack(3, 2)).toBe(2);
    expect(nextStepBack(2, 2)).toBeNull();
  });
});

describe('lastSteps', () => {
  it('puts a products step before the details only when there are products on offer', () => {
    expect(lastSteps(true)).toEqual({ productsStep: 4, detailsStep: 5 });
    expect(lastSteps(false)).toEqual({ productsStep: null, detailsStep: 4 });
  });
});

describe('wizardServices', () => {
  it('is the active list when nothing is being rescheduled', () => {
    const active = [svc('a'), svc('b')];
    expect(wizardServices(active)).toBe(active);
  });

  it("keeps a rescheduled booking's own deactivated service selectable, without duplicating an active one", () => {
    const active = [svc('a'), svc('b')];
    expect(wizardServices(active, svc('old')).map((s) => s.id)).toEqual(['old', 'a', 'b']);
    expect(wizardServices(active, svc('a')).map((s) => s.id)).toEqual(['a', 'b']);
  });
});
