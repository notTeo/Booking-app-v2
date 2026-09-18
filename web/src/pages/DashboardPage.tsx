import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarCheck, faStore, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { getMyShops, type Shop } from '../api/shop.api';
import { getBookingStats, type BookingWithStaff } from '../api/booking.api';
import { useLang } from '../context/LanguageContext';
import '../styles/pages/dashboard.css';
import '../styles/pages/shops.css';

interface ShopStat {
  shop: Shop;
  todayCount: number;
  upcomingCount: number;
  upcoming: BookingWithStaff[];
}

interface UpcomingRow extends BookingWithStaff {
  shopName: string;
  shopSlug: string;
}

const dateOf = (iso: string) => iso.split('T')[0];

export default function DashboardPage() {
  const { t } = useLang();
  const [shopStats, setShopStats] = useState<ShopStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyShops()
      .then((shops) =>
        Promise.all(
          shops.map((shop) =>
            getBookingStats(shop.id)
              .then((stats) => ({ shop, ...stats }))
              .catch(() => null),
          ),
        ),
      )
      .then((results) => setShopStats(results.filter((r): r is ShopStat => r !== null)))
      .catch(() => setError(t.dashboard.errorLoad))
      .finally(() => setLoading(false));
  }, []);

  const upcoming: UpcomingRow[] = shopStats
    .flatMap((s) => s.upcoming.map((b) => ({ ...b, shopName: s.shop.name, shopSlug: s.shop.slug })))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 8);

  if (loading) {
    return (
      <div className="dashboard-content">
        <div className="shops-spinner-wrap"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <div className="dash-header">
        <h1 className="dash-title">{t.dashboard.title}</h1>
        <p className="dash-subtitle">{t.dashboard.subtitle}</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {shopStats.length === 0 ? (
        <div className="shops-empty">
          <p>{t.dashboard.noShops}</p>
        </div>
      ) : (
        <>
          {/* Per-shop quick stats */}
          <div className="dash-actions">
            {shopStats.map(({ shop, todayCount, upcomingCount }) => (
              <Link key={shop.id} to={`/shops/${shop.slug}`} className="dash-action-card">
                <div className="dash-action-icon">
                  <FontAwesomeIcon icon={faStore} />
                </div>
                <div className="dash-action-text">
                  <p className="dash-action-label">{shop.name}</p>
                  <p className="dash-action-sub">
                    {t.dashboard.todayCount.replace('{count}', String(todayCount))}
                    {' · '}
                    {t.dashboard.upcomingCount.replace('{count}', String(upcomingCount))}
                  </p>
                </div>
                <FontAwesomeIcon icon={faArrowRight} className="dash-action-arrow" />
              </Link>
            ))}
          </div>

          {/* Upcoming across all shops */}
          <div className="dash-card">
            <p className="dash-card-title">{t.dashboard.upcomingAcrossShops}</p>
            {upcoming.length === 0 ? (
              <p className="dash-field-value--muted">{t.dashboard.noUpcoming}</p>
            ) : (
              <div className="dash-fields">
                {upcoming.map((b) => (
                  <Link
                    key={b.id}
                    to={`/shops/${b.shopSlug}/bookings?date=${dateOf(b.startTime)}`}
                    className="dash-field dash-field--link"
                  >
                    <div className="dash-field-icon">
                      <FontAwesomeIcon icon={faCalendarCheck} />
                    </div>
                    <div className="dash-field-body">
                      <p className="dash-field-label">{b.shopName} · {b.customer.name}</p>
                      <p className="dash-field-value">
                        {b.service.name} —{' '}
                        {new Date(b.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
