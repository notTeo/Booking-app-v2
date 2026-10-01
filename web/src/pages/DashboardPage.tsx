import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarCheck } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { getMyOverview, getMyUpcoming, type OverviewRange } from '../api/overview.api';
import Alert from '../components/Alert';
import OverviewHeader from '../components/overview/OverviewHeader';
import OverviewBody from '../components/overview/OverviewBody';
import UpcomingBookings from '../components/overview/UpcomingBookings';
import ShopCards from '../components/overview/ShopCards';
import NoShopsEmpty from '../components/overview/NoShopsEmpty';
import OverviewSkeleton from '../components/overview/OverviewSkeleton';
import '../styles/pages/shop-overview.css';

// One quick retry, then show the error (same as the shop overview).
const RETRY = 1;

/** The greeting's time of day follows the browser: there is no single shop here. */
const BROWSER_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const [range, setRange] = useState<OverviewRange>('week');

  const overviewQuery = useQuery({
    queryKey: ['my-overview', range],
    queryFn: () => getMyOverview(range),
    retry: RETRY,
  });
  const overview = overviewQuery.data;

  // Independent of the selected period, like the shop overview's.
  const upcomingQuery = useQuery({
    queryKey: ['my-upcoming'],
    queryFn: getMyUpcoming,
    retry: RETRY,
  });

  const shops = overview?.perShop ?? [];
  const onlyShop = shops.length === 1 ? shops[0] : undefined;

  // First load, or the shop list itself failed: no header to show yet.
  if (overviewQuery.isError && !overview) {
    return (
      <div className="overview-page">
        <h1 className="t-title">{t.dashboard.title}</h1>
        <Alert
          variant="danger"
          title={t.overview.error.title}
          actions={
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => overviewQuery.refetch()}>
              {t.overview.error.retry}
            </button>
          }
        >
          {t.overview.error.text}
        </Alert>
      </div>
    );
  }
  if (!overview) {
    return (
      <div className="overview-page">
        <h1 className="t-title">{t.dashboard.title}</h1>
        <OverviewSkeleton />
      </div>
    );
  }

  if (shops.length === 0) {
    return (
      <div className="overview-page">
        <h1 className="t-title">{t.dashboard.title}</h1>
        <NoShopsEmpty canCreate={!!user?.isPro} />
      </div>
    );
  }

  return (
    <div className="overview-page">
      <OverviewHeader zone={BROWSER_ZONE} range={range} onRangeChange={setRange} />
      <OverviewBody
        range={range}
        overview={overview}
        isError={false}
        onRetry={() => overviewQuery.refetch()}
        upcoming={
          <UpcomingBookings
            bookings={upcomingQuery.data}
            isError={upcomingQuery.isError}
            onRetry={() => upcomingQuery.refetch()}
            showShop
            // "View all" only makes sense when there is one place to go.
            viewAllTo={onlyShop ? `/shops/${onlyShop.slug}/bookings` : undefined}
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
        footer={<ShopCards shops={shops} />}
      />
    </div>
  );
}
