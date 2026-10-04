import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarCheck, faPlus, faStore } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { useMyShops } from '../hooks/useMyShops';
import { useMyInvites } from '../hooks/useMyInvites';
import { getMyOverview, getMyUpcoming, type OverviewRange, type ShopOverviewRow } from '../api/overview.api';
import type { Shop } from '../api/shop.api';
import Alert from '../components/Alert';
import OverviewHeader from '../components/overview/OverviewHeader';
import OverviewBody from '../components/overview/OverviewBody';
import RangeTabs from '../components/overview/RangeTabs';
import UpcomingBookings from '../components/overview/UpcomingBookings';
import ShopCards, { type ShopCardRow } from '../components/overview/ShopCards';
import InviteInbox from '../components/overview/InviteInbox';
import SubscriptionCard from '../components/overview/SubscriptionCard';
import '../styles/pages/shop-overview.css';

// One quick retry, then show the error (same as the shop overview).
const RETRY = 1;

/** The greeting's time of day follows the browser: there is no single shop here. */
const BROWSER_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/**
 * Shop cards: by bookings once the cross-shop overview has loaded (its perShop
 * order), by name until then. Each card carries its numbers when there are any.
 */
function shopRows(shops: Shop[], perShop: ShopOverviewRow[] | undefined): ShopCardRow[] {
  const rows = shops.map((shop) => ({
    id: shop.id,
    slug: shop.slug,
    name: shop.name,
    role: shop.role,
    metrics: perShop?.find((p) => p.shopId === shop.id),
  }));
  const rank = (id: string) => {
    const i = perShop?.findIndex((p) => p.shopId === id) ?? -1;
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return rows.sort((a, b) => rank(a.id) - rank(b.id) || a.name.localeCompare(b.name));
}

/** "Ask your shop owner to invite {email}", with the address in bold. */
function EmptyText({ text, email }: { text: string; email: string }) {
  const [before, after = ''] = text.split('{email}');
  return <p className="empty__text">{before}<strong>{email}</strong>{after}</p>;
}

/**
 * The one page outside a shop: the subscription, pending invites, the user's
 * shops and the overview summed across them. Every section is always shown,
 * with an empty state when it has nothing in it.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const [range, setRange] = useState<OverviewRange>('week');

  const shopsQuery = useMyShops();
  const invitesQuery = useMyInvites();
  const shops = shopsQuery.data ?? [];
  const invites = invitesQuery.data?.received ?? [];
  const hasShops = shops.length > 0;

  const overviewQuery = useQuery({
    queryKey: ['my-overview', range],
    queryFn: () => getMyOverview(range),
    retry: RETRY,
    enabled: hasShops,
  });
  // Independent of the selected period, like the shop overview's.
  const upcomingQuery = useQuery({
    queryKey: ['my-upcoming'],
    queryFn: getMyUpcoming,
    retry: RETRY,
    enabled: hasShops,
  });
  const overview = hasShops ? overviewQuery.data : undefined;

  const header = (
    <OverviewHeader
      zone={BROWSER_ZONE}
      // Creating a shop needs Pro: without it the button is there but disabled.
      action={user?.isPro ? (
        <Link to="/shops/new" className="btn btn--sm">
          <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
          {t.dashboard.createShop}
        </Link>
      ) : (
        <button type="button" className="btn btn--sm" disabled>
          <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
          {t.dashboard.createShop}
        </button>
      )}
    />
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

      <SubscriptionCard isPro={!!user?.isPro} />

      <InviteInbox invites={invites} />

      <ShopCards
        shops={shopRows(shops, overview?.perShop)}
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

      <section className="overview-page" aria-labelledby="dashboard-analytics-title">
        <div className="overview-head">
          <h2 className="t-subheading" id="dashboard-analytics-title">{t.dashboard.analytics}</h2>
          {hasShops && <RangeTabs value={range} onChange={setRange} />}
        </div>
        {hasShops ? (
          <OverviewBody
            range={range}
            overview={overview}
            isError={overviewQuery.isError && !overview}
            onRetry={() => overviewQuery.refetch()}
            upcoming={
              <UpcomingBookings
                bookings={upcomingQuery.data}
                isError={upcomingQuery.isError}
                onRetry={() => upcomingQuery.refetch()}
                showShop
              />
            }
            neverBooked={
              <div className="card">
                <div className="empty">
                  <span className="empty__icon"><FontAwesomeIcon icon={faCalendarCheck} aria-hidden="true" /></span>
                  <h3 className="empty__title">{t.dashboard.neverBooked.title}</h3>
                  <p className="empty__text">{t.dashboard.neverBooked.text}</p>
                </div>
              </div>
            }
          />
        ) : (
          <div className="card">
            <div className="empty empty--sm">
              <p className="empty__text">{t.dashboard.analyticsEmpty}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
