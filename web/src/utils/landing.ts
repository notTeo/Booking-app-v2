import type { QueryClient } from '@tanstack/react-query';
import { getMyInvites } from '../api/invite.api';
import { getMyShops } from '../api/shop.api';
import { MY_INVITES_KEY } from '../hooks/useMyInvites';
import { MY_SHOPS_KEY } from '../hooks/useMyShops';

// Where a user goes right after logging in or registering. PublicRoute is the
// only caller: it runs this once the user becomes authenticated on an auth
// page. /dashboard itself never redirects, so there are no loops.

// Stand-in origin for parsing: anything that resolves elsewhere is off-site.
const BASE = 'http://landing.invalid';

// Sending the user back to these would just bounce them through here again.
const AUTH_PAGES = ['/login', '/register', '/forgot-password'];

/** The `?redirect=` target if it is a path inside this app, else null. */
export function safeRedirect(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null;
  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return null;
  }
  // Catches what the prefix checks miss, e.g. "/\t/evil.com" (URL strips tabs).
  if (url.origin !== BASE) return null;
  if (AUTH_PAGES.includes(url.pathname)) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Pending invites first (they are only shown on the dashboard), then a sole shop; someone with no shop starts one. */
export function pickLanding({ pendingInvites, shopSlugs }: { pendingInvites: number; shopSlugs: string[] }): string {
  if (pendingInvites > 0) return '/dashboard';
  if (shopSlugs.length === 0) return '/shops/new';
  if (shopSlugs.length === 1) return `/shops/${shopSlugs[0]}`;
  return '/dashboard';
}

/** `search` is the auth page's query string, which may carry `redirect`. */
export async function resolveLanding(search: string, queryClient: QueryClient): Promise<string> {
  const redirect = safeRedirect(new URLSearchParams(search).get('redirect'));
  if (redirect) return redirect;
  try {
    const [invites, shops] = await Promise.all([
      // Same keys as the dashboard, so it starts warm.
      queryClient.fetchQuery({ queryKey: MY_INVITES_KEY, queryFn: getMyInvites }),
      queryClient.fetchQuery({ queryKey: MY_SHOPS_KEY, queryFn: getMyShops }),
    ]);
    return pickLanding({ pendingInvites: invites.received.length, shopSlugs: shops.map((s) => s.slug) });
  } catch {
    // The dashboard shows its own load errors; better than a stuck spinner.
    return '/dashboard';
  }
}
