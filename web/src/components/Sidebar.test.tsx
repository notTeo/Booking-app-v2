import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { translations } from '../locales/translations';
import Sidebar from './Sidebar';
import type { useSidebarWidth } from '../hooks/useSidebarWidth';

const shopState = vi.hoisted(() => ({ shop: null as null | { name: string; slug: string; role: 'owner' | 'manager' | 'staff' } }));

vi.mock('../context/ShopContext', () => ({
  useShop: () => ({ shop: shopState.shop, isLoading: false, error: null, refetch: () => {} }),
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ logout: async () => {} }) }));
vi.mock('../context/LanguageContext', () => ({ useLang: () => ({ t: translations.en }) }));

const t = translations.en.sidebar;

const handleProps = {} as ReturnType<typeof useSidebarWidth>['handleProps'];

function render(path: string, collapsed?: boolean) {
  const resize = collapsed === undefined ? undefined : { width: collapsed ? 80 : 256, collapsed, dragging: false, handleProps };
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar compact={false} isOpen={false} onClose={() => {}} resize={resize} />
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

  it('owner: shop name, all shop items and account, no logout', () => {
    shopState.shop = { name: 'Hairology', slug: 'hair', role: 'owner' };
    const html = render('/shops/hair/bookings');
    for (const label of [t.backToShops, 'Hairology', t.overview, t.bookings, t.services, t.team, t.customers, t.shopSettings, t.account]) {
      expect(html).toContain(label);
    }
    expect(html).not.toContain(t.logout);
    expect(html).not.toContain('/invites');
    expect(html).not.toContain(t.bookAppointment);
  });

  it('manager: the same shop items as the owner', () => {
    shopState.shop = { name: 'Hairology', slug: 'hair', role: 'manager' };
    const html = render('/shops/hair/bookings');
    for (const label of [t.overview, t.bookings, t.services, t.team, t.customers, t.shopSettings]) {
      expect(html).toContain(label);
    }
  });

  it('staff: no Team, Customers or Shop settings', () => {
    shopState.shop = { name: 'Hairology', slug: 'hair', role: 'staff' };
    const html = render('/shops/hair');
    for (const label of [t.backToShops, t.overview, t.bookings, t.services, t.account]) expect(html).toContain(label);
    expect(html).not.toContain('/shops/hair/team');
    expect(html).not.toContain('/shops/hair/customers');
    expect(html).not.toContain('/shops/hair/settings');
  });

  it('marks the current page with aria-current', () => {
    shopState.shop = { name: 'Hairology', slug: 'hair', role: 'owner' };
    expect(render('/shops/hair/services')).toContain('aria-current="page"');
  });

  it('collapsed: icon rail with the short logo and a name on every link', () => {
    shopState.shop = { name: 'Hairology', slug: 'hair', role: 'owner' };
    const html = render('/shops/hair', true);
    expect(html).toContain('sidebar--collapsed');
    expect(html).not.toContain('Booked');
    for (const label of [t.backToShops, t.overview, t.bookings, t.services, t.team, t.customers, t.shopSettings, t.account]) {
      expect(html).toContain(`aria-label="${label}"`);
    }
  });

  it('expanded: full logo and no collapsed class', () => {
    shopState.shop = { name: 'Hairology', slug: 'hair', role: 'owner' };
    const html = render('/shops/hair', false);
    expect(html).not.toContain('sidebar--collapsed');
    expect(html).toContain('Booked');
    expect(html).not.toContain(`aria-label="${t.overview}"`);
  });
});
