import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { getOverview, type OverviewRange } from '../api/overview.api';
import { listBookings } from '../api/booking.api';
import { publicShopUrl } from '../utils/publicLink';
import { todayInZone } from '../utils/shopTime';
import { firstName, greetingPeriod } from '../utils/overviewFormat';
import Alert from '../components/Alert';
import RangeTabs from '../components/overview/RangeTabs';
import { PANEL_ID, tabId } from '../utils/overviewRanges';
import StatCards from '../components/overview/StatCards';
import BookingsChart from '../components/overview/BookingsChart';
import RecentBookings from '../components/overview/RecentBookings';
import StatusDonut from '../components/overview/StatusDonut';
import OverviewSkeleton from '../components/overview/OverviewSkeleton';
import OverviewEmpty from '../components/overview/OverviewEmpty';
import '../styles/pages/shop-overview.css';

const RECENT_LIMIT = 5;
// One quick retry, then show the error; the default (3 retries with backoff) leaves the skeleton up for ~7s.
const RETRY = 1;

export default function ShopOverviewPage() {
  const { shop, isLoading } = useShop();
  const { user } = useAuth();
  const { t } = useLang();
  const [range, setRange] = useState<OverviewRange>('week');

  const overviewQuery = useQuery({
    queryKey: ['overview', shop?.id, range],
    queryFn: () => getOverview(shop!.id, range),
    enabled: !!shop,
    retry: RETRY,
  });
  const overview = overviewQuery.data;
  const isEmpty = !!overview && overview.totals.all + overview.totals.canceled === 0;

  // Recent bookings follow the window the API actually used.
  const recentQuery = useQuery({
    queryKey: ['overview-recent', shop?.id, overview?.from, overview?.to],
    queryFn: () => listBookings(shop!.id, { from: overview!.from, to: overview!.to, limit: RECENT_LIMIT, order: 'desc' }),
    enabled: !!shop && !!overview && !isEmpty,
    retry: RETRY,
  });

  if (isLoading) return <div className="state-view">{t.overview.loading}</div>;
  if (!shop) return <div className="state-view">{t.overview.noShop}</div>;

  const today = todayInZone(shop.timezone);
  const greetingKey = {
    morning: 'greetingMorning',
    afternoon: 'greetingAfternoon',
    evening: 'greetingEvening',
  }[greetingPeriod(shop.timezone)] as 'greetingMorning' | 'greetingAfternoon' | 'greetingEvening';
  const greeting = t.overview[greetingKey].replace('{name}', firstName(user?.name ?? ''));

  return (
    <div className="overview-page">
      <div className="overview-head">
        <h1 className="t-title">{greeting}</h1>
        <RangeTabs value={range} onChange={setRange} />
      </div>

      <div role="tabpanel" id={PANEL_ID} aria-labelledby={tabId(range)} className="overview-page">
        {overviewQuery.isError ? (
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
        ) : !overview ? (
          <OverviewSkeleton />
        ) : (
          <>
            <StatCards totals={overview.totals} />
            {isEmpty ? (
              <OverviewEmpty link={publicShopUrl(shop.slug)} />
            ) : (
              <div className="overview-grid">
                <div className="overview-grid__chart">
                  <BookingsChart overview={overview} today={today} />
                </div>
                <RecentBookings
                  bookings={recentQuery.data}
                  isError={recentQuery.isError}
                  onRetry={() => recentQuery.refetch()}
                  zone={shop.timezone}
                  viewAllTo={`/shops/${shop.slug}/bookings`}
                />
                <StatusDonut totals={overview.totals} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
