import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { translations } from '../locales/translations';
import Sidebar from './Sidebar';

const shopState = vi.hoisted(() => ({ shop: null as null | { name: string; slug: string; role: 'owner' | 'staff' } }));

vi.mock('../context/ShopContext', () => ({
  useShop: () => ({ shop: shopState.shop, isLoading: false, error: null, refetch: () => {} }),
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ logout: async () => {} }) }));
vi.mock('../context/LanguageContext', () => ({ useLang: () => ({ t: translations.en }) }));

const t = translations.en.sidebar;

function render(path: string) {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar compact={false} isOpen={false} onClose={() => {}} />
    </MemoryRouter>,
  );
}

describe('Sidebar', () => {
  beforeEach(() => { shopState.shop = null; });

  it('has no account-level items; the only way out is back to the dashboard', () => {
    shopState.shop = { name: 'Hairology', slug: 'hair', role: 'owner' };
    const html = render('/shops/hair');
    expect(html).not.toContain(`>${t.dashboard}<`);
    expect(html).not.toContain('href="/invites"');
    expect(html).not.toContain('href="/shops"');
    expect(html.match(/href="\/dashboard"/g)).toHaveLength(1);
    expect(html).toContain(t.backToShops);
  });

  it('renders no navigation outside a shop', () => {
    expect(render('/dashboard')).not.toContain('nav-item');
    expect(render('/shops/new')).not.toContain('nav-item');
  });

  it('owner: shop name, all shop items, account and logout', () => {
    shopState.shop = { name: 'Hairology', slug: 'hair', role: 'owner' };
    const html = render('/shops/hair/bookings');
    for (const label of [t.backToShops, 'Hairology', t.overview, t.bookings, t.services, t.team, t.customers, t.shopSettings, t.account, t.logout]) {
      expect(html).toContain(label);
    }
    expect(html).not.toContain('/invites');
    expect(html).not.toContain(t.bookAppointment);
  });

  it('staff: no Team, Customers or Shop settings', () => {
    shopState.shop = { name: 'Hairology', slug: 'hair', role: 'staff' };
    const html = render('/shops/hair');
    for (const label of [t.backToShops, t.overview, t.bookings, t.services, t.account, t.logout]) expect(html).toContain(label);
    expect(html).not.toContain('/shops/hair/team');
    expect(html).not.toContain('/shops/hair/customers');
    expect(html).not.toContain('/shops/hair/settings');
  });

  it('marks the current page with aria-current', () => {
    shopState.shop = { name: 'Hairology', slug: 'hair', role: 'owner' };
    expect(render('/shops/hair/services')).toContain('aria-current="page"');
  });
});
