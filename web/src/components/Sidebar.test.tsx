import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { translations } from '../locales/translations';
import { MY_INVITES_KEY } from '../hooks/useMyInvites';
import Sidebar from './Sidebar';

const shopState = vi.hoisted(() => ({ shop: null as null | { name: string; slug: string; role: 'owner' | 'staff' } }));

vi.mock('../context/ShopContext', () => ({
  useShop: () => ({ shop: shopState.shop, isLoading: false, error: null, refetch: () => {} }),
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ logout: async () => {} }) }));
vi.mock('../context/LanguageContext', () => ({ useLang: () => ({ t: translations.en }) }));

const t = translations.en.sidebar;

function render(path: string, invites?: { received: unknown[]; sent: unknown[] }) {
  const queryClient = new QueryClient();
  if (invites) queryClient.setQueryData(MY_INVITES_KEY, invites);
  return renderToString(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Sidebar compact={false} isOpen={false} onClose={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Sidebar', () => {
  beforeEach(() => { shopState.shop = null; });

  it('level 1: dashboard, shops, account, logout and no "App" label', () => {
    const html = render('/dashboard');
    for (const label of [t.dashboard, t.shops, t.account, t.logout]) expect(html).toContain(label);
    expect(html).not.toContain(t.myInvites);
    expect(html).not.toContain(t.backToShops);
    expect(html).toContain('href="/account"');
  });

  it('level 1 on /account and /shops/new is still level 1', () => {
    expect(render('/account')).not.toContain(t.backToShops);
    expect(render('/shops/new')).not.toContain(t.backToShops);
  });

  it('shows My invites with a received-count badge when invites exist', () => {
    const html = render('/dashboard', { received: [{}, {}], sent: [] });
    expect(html).toContain(t.myInvites);
    expect(html).toContain('href="/invites"');
    expect(html).toContain('>2</span>');
  });

  it('keeps My invites reachable with only sent invites, without a badge', () => {
    const html = render('/dashboard', { received: [], sent: [{}] });
    expect(html).toContain(t.myInvites);
    expect(html).not.toContain('badge');
  });

  it('level 2 owner: shop name, all shop items, account and logout', () => {
    shopState.shop = { name: 'Hairology', slug: 'hair', role: 'owner' };
    const html = render('/shops/hair/bookings');
    for (const label of [t.backToShops, 'Hairology', t.overview, t.bookings, t.services, t.team, t.customers, t.shopSettings, t.account, t.logout]) {
      expect(html).toContain(label);
    }
    expect(html).not.toContain('/invites');
    expect(html).not.toContain(t.bookAppointment);
  });

  it('level 2 staff: no Team, Customers or Shop settings', () => {
    shopState.shop = { name: 'Hairology', slug: 'hair', role: 'staff' };
    const html = render('/shops/hair');
    for (const label of [t.overview, t.bookings, t.services, t.account, t.logout]) expect(html).toContain(label);
    expect(html).not.toContain('/shops/hair/team');
    expect(html).not.toContain('/shops/hair/customers');
    expect(html).not.toContain('/shops/hair/settings');
  });

  it('marks the current page with aria-current', () => {
    expect(render('/shops')).toContain('aria-current="page"');
  });
});
