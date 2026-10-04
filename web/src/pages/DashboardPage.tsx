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
import '../styles/pages/shop-overview.css';

// One quick retry, then show the error (same as the shop overview).
const RETRY = 1;

/** The greeting's time of day follows the browser: there is no single shop here. */
const BROWSER_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/**
 * Shop cards: by bookings when the cross-shop overview is shown (its perShop
 * order), otherwise by name. Each card carries its numbers when there are any.
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
 * The one page outside a shop: pending invites, the user's shops, and for
 * owners of two or more shops the overview summed across them.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const [range, setRange] = useState<OverviewRange>('week');

  const shopsQuery = useMyShops();
  const invitesQuery = useMyInvites();
  const shops = shopsQuery.data ?? [];
  const invites = invitesQuery.data?.received ?? [];
  const showAnalytics = shops.filter((s) => s.role === 'owner').length >= 2;

  const overviewQuery = useQuery({
    queryKey: ['my-overview', range],
    queryFn: () => getMyOverview(range),
    retry: RETRY,
    enabled: showAnalytics,
  });
  // Independent of the selected period, like the shop overview's.
  const upcomingQuery = useQuery({
    queryKey: ['my-upcoming'],
    queryFn: getMyUpcoming,
    retry: RETRY,
    enabled: showAnalytics,
  });
  const overview = showAnalytics ? overviewQuery.data : undefined;

  const header = (
    <OverviewHeader
      zone={BROWSER_ZONE}
      action={user?.isPro && (
        <Link to="/shops/new" className="btn btn--sm">
          <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
          {t.dashboard.createShop}
        </Link>
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

      {invites.length > 0 && <InviteInbox invites={invites} />}

      {shops.length > 0 && <ShopCards shops={shopRows(shops, overview?.perShop)} />}

      {shops.length === 0 && invites.length === 0 && (
        <div className="card">
          <div className="empty">
            <span className="empty__icon"><FontAwesomeIcon icon={faStore} aria-hidden="true" /></span>
            <h2 className="empty__title">{t.dashboard.empty.title}</h2>
            <EmptyText text={t.dashboard.empty.text} email={user?.email ?? ''} />
          </div>
        </div>
      )}

      {showAnalytics && (
        <section className="overview-page" aria-labelledby="dashboard-analytics-title">
          <div className="overview-head">
            <h2 className="card__title" id="dashboard-analytics-title">{t.dashboard.analytics}</h2>
            <RangeTabs value={range} onChange={setRange} />
          </div>
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
                  <h2 className="empty__title">{t.dashboard.neverBooked.title}</h2>
                  <p className="empty__text">{t.dashboard.neverBooked.text}</p>
                </div>
              </div>
            }
          />
        </section>
      )}
    </div>
  );
}
