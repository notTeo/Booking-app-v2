import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { translations } from '../locales/translations';
import Sidebar from './Sidebar';
import type { useSidebarWidth } from '../hooks/useSidebarWidth';

type TestShop = { name: string; slug: string; role: 'owner' | 'manager' | 'staff' };
const shopState = vi.hoisted(() => ({ shop: null as null | TestShop, myShops: [] as TestShop[] }));

vi.mock('../context/ShopContext', () => ({
  useShop: () => ({ shop: shopState.shop, isLoading: false, error: null, refetch: () => {} }),
}));
vi.mock('../hooks/useMyShops', () => ({ useMyShops: () => ({ data: shopState.myShops }) }));
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
  beforeEach(() => { shopState.shop = null; shopState.myShops = []; });

  it('has no account-level items; the only way out is back to the dashboard', () => {
    shopState.shop = { name: 'Hairology', slug: 'hair', role: 'owner' };
    const html = render('/shops/hair');
    expect(html).not.toContain(`>${t.dashboard}<`);
    expect(html).not.toContain('href="/invites"');
    expect(html).not.toContain('href="/shops"');
    expect(html.match(/href="\/dashboard"/g)).toHaveLength(1);
    expect(html).toContain(t.home);
  });

  it('not in any shop: only the logo, Home, Help and Account', () => {
    for (const path of ['/dashboard', '/account', '/shops/new']) {
      const html = render(path);
      expect(html, path).toContain('wordmark');
      expect(html, path).toContain('href="/dashboard"');
      expect(html, path).toContain('href="/help"');
      expect(html, path).toContain('href="/account"');
      expect(html.match(/<a [^>]*class="nav-item/g), path).toHaveLength(3);
      expect(html, path).not.toContain('sidebar__title');
    }
  });

  it('outside a shop the sidebar is the same as inside: the name and links of my shop', () => {
    shopState.myShops = [{ name: 'Hairology', slug: 'hair', role: 'owner' }];
    for (const path of ['/account', '/dashboard', '/shops/new']) {
      const html = render(path);
      expect(html, path).toContain('Hairology');
      for (const href of ['/dashboard', '/shops/hair', '/shops/hair/bookings', '/shops/hair/services', '/shops/hair/team', '/shops/hair/customers', '/shops/hair/settings', '/account']) {
        expect(html, path).toContain(`href="${href}"`);
      }
    }
  });

  it('outside a shop a staff member still gets only the staff links', () => {
    shopState.myShops = [{ name: 'Hairology', slug: 'hair', role: 'staff' }];
    const html = render('/account');
    expect(html).toContain('href="/shops/hair/bookings"');
    expect(html).not.toContain('/shops/hair/team');
    expect(html).not.toContain('/shops/hair/settings');
  });

  it('everyone gets Help, right above Account', () => {
    shopState.myShops = [{ name: 'Hairology', slug: 'hair', role: 'staff' }];
    const html = render('/help');
    expect(html).toMatch(/aria-current="page"[^>]*href="\/help"/);
    expect(html.indexOf('href="/help"')).toBeLessThan(html.indexOf('href="/account"'));
    expect(html.indexOf('href="/help"')).toBeGreaterThan(html.indexOf('sidebar__footer'));
  });

  it('marks only Home or Account as current on their own pages', () => {
    shopState.myShops = [{ name: 'Hairology', slug: 'hair', role: 'owner' }];
    expect(render('/dashboard')).toMatch(/aria-current="page"[^>]*href="\/dashboard"/);
    expect(render('/account')).toMatch(/aria-current="page"[^>]*href="\/account"/);
    expect(render('/account').match(/aria-current="page"/g)).toHaveLength(1);
  });

  it('owner: shop name, all shop items and account, no logout', () => {
    shopState.shop = { name: 'Hairology', slug: 'hair', role: 'owner' };
    const html = render('/shops/hair/bookings');
    for (const label of [t.home, 'Hairology', t.overview, t.bookings, t.services, t.team, t.customers, t.shopSettings, t.account]) {
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
    for (const label of [t.home, t.overview, t.bookings, t.services, t.account]) expect(html).toContain(label);
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
    for (const label of [t.home, t.overview, t.bookings, t.services, t.team, t.customers, t.shopSettings, t.account]) {
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
