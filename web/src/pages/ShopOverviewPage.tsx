import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { getOverview, type OverviewRange } from '../api/overview.api';
import { getBookingStats } from '../api/booking.api';
import { publicShopUrl } from '../utils/publicLink';
import UpcomingBookings from '../components/overview/UpcomingBookings';
import OverviewHeader from '../components/overview/OverviewHeader';
import OverviewBody from '../components/overview/OverviewBody';
import OverviewEmpty from '../components/overview/OverviewEmpty';
import '../styles/pages/shop-overview.css';

// One quick retry, then show the error; the default (3 retries with backoff) leaves the skeleton up for ~7s.
const RETRY = 1;

export default function ShopOverviewPage() {
  const { shop, isLoading } = useShop();
  const { t } = useLang();
  const [range, setRange] = useState<OverviewRange>('week');

  const overviewQuery = useQuery({
    queryKey: ['overview', shop?.id, range],
    queryFn: () => getOverview(shop!.id, range),
    enabled: !!shop,
    retry: RETRY,
  });
  const overview = overviewQuery.data;

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

  return (
    <div className="overview-page">
      <OverviewHeader zone={shop.timezone} range={range} onRangeChange={setRange} />
      <OverviewBody
        range={range}
        overview={overview}
        isError={overviewQuery.isError}
        onRetry={() => overviewQuery.refetch()}
        upcoming={upcoming}
        neverBooked={<OverviewEmpty link={publicShopUrl(shop.slug)} />}
      />
    </div>
  );
}
