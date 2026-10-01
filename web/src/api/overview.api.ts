import client from './client';
import type { UpcomingBooking } from '../components/overview/UpcomingBookings';

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

export interface ShopOverviewRow {
  shopId: string;
  name: string;
  slug: string;
  /** Non-canceled bookings in the period. */
  total: number;
  pending: number;
  /** Non-canceled bookings today, in that shop's own timezone. */
  today: number;
}

/** The same shape as a shop overview, summed across all of the user's shops. */
export interface MyOverview extends Overview {
  perShop: ShopOverviewRow[];
}

export const getMyOverview = (range: OverviewRange) =>
  client
    .get('/api/shops/overview', { params: { range } })
    .then((r) => r.data.data as MyOverview);

export const getMyUpcoming = () =>
  client
    .get('/api/shops/upcoming')
    .then((r) => r.data.data as UpcomingBooking[]);
