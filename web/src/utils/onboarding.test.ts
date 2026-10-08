import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetPlan, isSetupStep, recallPlan, rememberPlan, setupSteps, slugFromName, PLAN_FEATURES } from './onboarding';

describe('setupSteps', () => {
  it('Solo has no team or products step', () => {
    expect(setupSteps(PLAN_FEATURES.SOLO)).toEqual(['hours', 'services', 'share']);
  });

  it('Team and Business have every step', () => {
    const all = ['hours', 'services', 'team', 'products', 'share'];
    expect(setupSteps(PLAN_FEATURES.TEAM)).toEqual(all);
    expect(setupSteps(PLAN_FEATURES.BUSINESS)).toEqual(all);
  });
});

describe('isSetupStep', () => {
  it('knows the steps and nothing else', () => {
    expect(isSetupStep('services')).toBe(true);
    expect(isSetupStep('plan')).toBe(false);
    expect(isSetupStep(null)).toBe(false);
  });
});

describe('the plan picked on the marketing site', () => {
  // The tests run without a browser: an in-memory stand-in for localStorage.
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    });
  });

  it('is Team when nothing was picked', () => {
    expect(recallPlan()).toBe('TEAM');
  });

  it('is remembered from the link, whatever its case', () => {
    rememberPlan('solo');
    expect(recallPlan()).toBe('SOLO');
    rememberPlan('Business');
    expect(recallPlan()).toBe('BUSINESS');
  });

  it('ignores a plan that does not exist', () => {
    rememberPlan('solo');
    rememberPlan('gold');
    rememberPlan(null);
    expect(recallPlan()).toBe('SOLO');
  });

  it('is forgotten once the shop is created', () => {
    rememberPlan('solo');
    forgetPlan();
    expect(recallPlan()).toBe('TEAM');
  });
});

describe('slugFromName', () => {
  it.each([
    ['Studio Elia', 'studio-elia'],
    ["  Nick's  Barber & Co. ", 'nick-s-barber-co'],
    ['Κομμωτήριο', ''],
    ['a'.repeat(50), 'a'.repeat(40)],
    [`${'a'.repeat(39)} b`, 'a'.repeat(39)],
  ])('%s -> %s', (name, slug) => {
    expect(slugFromName(name)).toBe(slug);
  });
});
