import client from './client';

export type OverviewRange = 'week' | 'month' | 'quarter';

export interface OverviewBucket {
  start: string; // YYYY-MM-DD, shop-local
  end: string;   // inclusive; weekly buckets are clipped to the period
  count: number; // non-canceled bookings
}

export interface Overview {
  range: OverviewRange;
  from: string;
  to: string;
  /** Shop-local date the period was computed for; later buckets are scheduled. */
  today: string;
  /** Whether the shop has any booking at all (any period, any status). */
  hasAnyBookings: boolean;
  totals: {
    all: number; // non-canceled
    pending: number;
    confirmed: number;
    completed: number;
    canceled: number;
    noShow: number;
  };
  buckets: OverviewBucket[];
}

export const getOverview = (shopId: string, range: OverviewRange) =>
  client
    .get(`/api/shops/${shopId}/overview`, { params: { range } })
    .then((r) => r.data.data as Overview);
