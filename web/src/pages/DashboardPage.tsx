import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faStore } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { useMyShops } from '../hooks/useMyShops';
import { useMyInvites } from '../hooks/useMyInvites';
import type { Shop } from '../api/shop.api';
import Alert from '../components/Alert';
import OverviewHeader from '../components/overview/OverviewHeader';
import ShopCards, { type ShopCardRow } from '../components/overview/ShopCards';
import InviteInbox from '../components/overview/InviteInbox';
import '../styles/pages/shop-overview.css';

/** The greeting's time of day follows the browser: there is no single shop here. */
const BROWSER_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/** Shop cards, by name. */
const shopRows = (shops: Shop[]): ShopCardRow[] =>
  shops
    .map((shop) => ({
      id: shop.id,
      slug: shop.slug,
      name: shop.name,
      role: shop.role,
      address: shop.formattedAddress,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

/** "Ask your shop owner to invite {email}", with the address in bold. */
function EmptyText({ text, email }: { text: string; email: string }) {
  const [before, after = ''] = text.split('{email}');
  return <p className="empty__text">{before}<strong>{email}</strong>{after}</p>;
}

/**
 * The one page outside a shop: the user's
 * shops with Create shop after the last one, and pending invites. Both
 * sections are always shown, with an empty state when they have nothing in them.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const shopsQuery = useMyShops();
  const invitesQuery = useMyInvites();
  const shops = shopsQuery.data ?? [];
  const invites = invitesQuery.data?.received ?? [];

  const header = <OverviewHeader zone={BROWSER_ZONE} />;

  const createShop = (
    <Link to="/shops/new" className="card card--interactive card--dashed">
      <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
      <span>{t.dashboard.createShop}</span>
    </Link>
  );

  if (shopsQuery.isError || invitesQuery.isError) {
    return (
      <div className="overview-page">
        {header}
        <Alert
          variant="danger"
          actions={
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => { shopsQuery.refetch(); invitesQuery.refetch(); }}
            >
              {t.overview.error.retry}
            </button>
          }
        >
          {t.shops.errorLoad}
        </Alert>
      </div>
    );
  }

  if (shopsQuery.isPending || invitesQuery.isPending) {
    return (
      <div className="overview-page" aria-busy="true">
        {header}
        <ul className="shop-cards__grid">
          {[0, 1, 2].map((i) => <li key={i} className="skeleton skeleton--block" />)}
        </ul>
      </div>
    );
  }

  return (
    <div className="overview-page">
      {header}

      <ShopCards
        shops={shopRows(shops)}
        createShop={createShop}
        empty={
          <div className="card">
            <div className="empty">
              <span className="empty__icon"><FontAwesomeIcon icon={faStore} aria-hidden="true" /></span>
              <h3 className="empty__title">{t.dashboard.empty.title}</h3>
              <EmptyText text={t.dashboard.empty.text} email={user?.email ?? ''} />
            </div>
          </div>
        }
      />

      <InviteInbox invites={invites} />
    </div>
  );
}
