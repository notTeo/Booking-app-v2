import { describe, it, expect, afterEach, vi } from 'vitest';
import { buildISODateTime, anticipatedRuleCodes, groupSlotSections } from './wizardUtils';
import type { SlotsResponse } from '../../api/public.api';

const ATHENS = 'Europe/Athens';

// The customer's browser timezone (process TZ under vitest) must never leak
// into the instant that gets booked: it is always the SHOP's wall-clock time.
describe('buildISODateTime(date, time, shopTimezone)', () => {
  it('winter: 10:00 Athens is 08:00Z', () => {
    expect(buildISODateTime('2027-02-01', '10:00', ATHENS)).toBe(
      '2027-02-01T08:00:00.000Z',
    );
  });

  it('summer: 10:00 Athens is 07:00Z', () => {
    expect(buildISODateTime('2027-07-05', '10:00', ATHENS)).toBe(
      '2027-07-05T07:00:00.000Z',
    );
  });

  it('DST-start day 2027-03-28: 10:00 Athens is 07:00Z (EEST)', () => {
    expect(buildISODateTime('2027-03-28', '10:00', ATHENS)).toBe(
      '2027-03-28T07:00:00.000Z',
    );
  });

  it('DST-end day 2027-10-31: 10:00 Athens is 08:00Z (EET)', () => {
    expect(buildISODateTime('2027-10-31', '10:00', ATHENS)).toBe(
      '2027-10-31T08:00:00.000Z',
    );
  });

  it('repeated hour 2027-10-31 03:30 maps to the earlier instant (matches the server)', () => {
    expect(buildISODateTime('2027-10-31', '03:30', ATHENS)).toBe(
      '2027-10-31T00:30:00.000Z',
    );
  });

  it('uses the shop zone, not a hardcoded one', () => {
    expect(buildISODateTime('2027-02-01', '10:00', 'America/New_York')).toBe(
      '2027-02-01T15:00:00.000Z',
    );
  });
});

// Ambiguous (repeated) wall-clock times must resolve the same way regardless
// of WHEN the code runs — the season at "now" must not pick the offset.
describe('ambiguous time resolution does not depend on the current date', () => {
  afterEach(() => vi.useRealTimers());

  for (const now of ['2026-12-01T09:00:00Z', '2026-07-15T09:00:00Z']) {
    it(`03:30 on 2027-10-31 is the earlier instant when now = ${now}`, () => {
      vi.useFakeTimers({ toFake: ['Date'], now: new Date(now) });
      expect(buildISODateTime('2027-10-31', '03:30', ATHENS)).toBe(
        '2027-10-31T00:30:00.000Z',
      );
    });
  }
});

describe("anticipatedRuleCodes (what the last step will ask the owner to accept)", () => {
  const slot = (time: string, extra: object = {}) => ({
    time,
    available: true,
    ...extra,
  });
  const ok = (...slots: ReturnType<typeof slot>[]): SlotsResponse => ({
    status: "ok",
    slots,
  });

  it("an ordinary in-hours slot needs nothing", () => {
    expect(
      anticipatedRuleCodes(
        ok(slot("10:00", { outsideHours: false, past: false })),
        "10:00",
      ),
    ).toEqual([]);
  });

  it("before opening, break and after closing all need OUTSIDE_OPENING_HOURS", () => {
    for (const reason of [
      "BEFORE_OPENING",
      "BREAK",
      "AFTER_CLOSING",
    ] as const) {
      const slots = ok(
        slot("20:30", { outsideHours: true, past: false, reason }),
      );
      expect(anticipatedRuleCodes(slots, "20:30"), reason).toEqual([
        "OUTSIDE_OPENING_HOURS",
      ]);
    }
  });

  it("a closed day needs SHOP_CLOSED", () => {
    const slots: SlotsResponse = {
      status: "closed",
      slots: [
        slot("10:00", {
          outsideHours: true,
          past: false,
          reason: "CLOSED_DAY",
        }),
      ],
    };
    expect(anticipatedRuleCodes(slots, "10:00")).toEqual(["SHOP_CLOSED"]);
  });

  it("a slot in the past adds BOOKING_IN_PAST, on top of any hours rule", () => {
    expect(
      anticipatedRuleCodes(
        ok(slot("10:00", { outsideHours: false, past: true })),
        "10:00",
      ),
    ).toEqual(["BOOKING_IN_PAST"]);
    const both = ok(
      slot("06:00", {
        outsideHours: true,
        past: true,
        reason: "BEFORE_OPENING",
      }),
    );
    expect(anticipatedRuleCodes(both, "06:00")).toEqual([
      "OUTSIDE_OPENING_HOURS",
      "BOOKING_IN_PAST",
    ]);
  });

  it("a time that is not one of the listed slots is unknown (null): the server decides", () => {
    expect(anticipatedRuleCodes(ok(slot("10:00")), "21:10")).toBeNull();
    expect(anticipatedRuleCodes({ status: "closed" }, "10:00")).toBeNull();
  });

  it("slots from an older server (no flags) anticipate nothing", () => {
    expect(anticipatedRuleCodes(ok(slot("10:00")), "10:00")).toEqual([]);
  });
});

describe("groupSlotSections", () => {
  const s = (time: string, extra: object = {}) => ({
    time,
    available: true,
    ...extra,
  });
  const slots = [
    s("06:00", { outsideHours: true, reason: "BEFORE_OPENING" }),
    s("09:00", { outsideHours: false }),
    s("09:30", { outsideHours: false }),
    s("12:00", { outsideHours: true, reason: "BREAK" }),
    s("17:30", { outsideHours: true, reason: "AFTER_CLOSING" }),
  ];

  it("with the toggle off only the working-hours section is returned", () => {
    const groups = groupSlotSections(slots, false);
    expect(groups.map((g) => g.key)).toEqual(["working"]);
    expect(groups[0].slots.map((x) => x.time)).toEqual(["09:00", "09:30"]);
  });

  it("with the toggle on: working hours, before opening, break, after closing, in that order", () => {
    const groups = groupSlotSections(slots, true);
    expect(groups.map((g) => g.key)).toEqual([
      "working",
      "BEFORE_OPENING",
      "BREAK",
      "AFTER_CLOSING",
    ]);
  });

  it("skips empty sections and a closed day is one CLOSED_DAY section", () => {
    const closed = [s("10:00", { outsideHours: true, reason: "CLOSED_DAY" })];
    expect(groupSlotSections(closed, true).map((g) => g.key)).toEqual([
      "CLOSED_DAY",
    ]);
    expect(groupSlotSections(closed, false)).toEqual([]);
  });

  it("treats slots without flags (older server / public) as working hours", () => {
    expect(groupSlotSections([s("09:00")], false).map((g) => g.key)).toEqual([
      "working",
    ]);
  });
});
