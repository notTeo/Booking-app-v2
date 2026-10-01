import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { getOverview, type OverviewRange } from '../api/overview.api';
import { getBookingStats } from '../api/booking.api';
import { publicShopUrl } from '../utils/publicLink';
import { firstName, greetingPeriod } from '../utils/overviewFormat';
import Alert from '../components/Alert';
import RangeTabs from '../components/overview/RangeTabs';
import { PANEL_ID, tabId } from '../utils/overviewRanges';
import StatCards from '../components/overview/StatCards';
import BookingsChart from '../components/overview/BookingsChart';
import UpcomingBookings from '../components/overview/UpcomingBookings';
import StatusDonut from '../components/overview/StatusDonut';
import OverviewSkeleton from '../components/overview/OverviewSkeleton';
import OverviewEmpty, { PeriodEmpty } from '../components/overview/OverviewEmpty';
import '../styles/pages/shop-overview.css';

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
  const periodIsEmpty = !!overview && overview.totals.all + overview.totals.canceled === 0;

  // The next 5 bookings from now (canceled excluded). Deliberately independent
  // of the selected period, so it is not refetched when the switch changes.
  const upcomingQuery = useQuery({
    queryKey: ['overview-upcoming', shop?.id],
    queryFn: () => getBookingStats(shop!.id).then((stats) => stats.upcoming),
    enabled: !!shop,
    retry: RETRY,
  });
  const upcoming = (
    <UpcomingBookings
      bookings={upcomingQuery.data}
      isError={upcomingQuery.isError}
      onRetry={() => upcomingQuery.refetch()}
      zone={shop?.timezone ?? 'UTC'}
      viewAllTo={`/shops/${shop?.slug}/bookings`}
    />
  );

  if (isLoading) return <div className="state-view">{t.overview.loading}</div>;
  if (!shop) return <div className="state-view">{t.overview.noShop}</div>;

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
            {periodIsEmpty ? (
              overview.hasAnyBookings ? (
                <>
                  <PeriodEmpty range={overview.range} />
                  {upcoming}
                </>
              ) : (
                <OverviewEmpty link={publicShopUrl(shop.slug)} />
              )
            ) : (
              <div className="overview-grid">
                <div className="overview-grid__chart">
                  <BookingsChart overview={overview} />
                </div>
                {upcoming}
                <StatusDonut totals={overview.totals} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
