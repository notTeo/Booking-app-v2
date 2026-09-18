import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarCheck } from '@fortawesome/free-solid-svg-icons';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { listBookings, getBookingStats, type Booking, type BookingWithStaff } from '../api/booking.api';
import { getMembers } from '../api/team.api';
import { getServices } from '../api/service.api';
import { getCustomers } from '../api/customer.api';
import '../styles/pages/shop-overview.css';
import '../styles/pages/dashboard.css';

const todayISO = () => new Date().toISOString().split('T')[0];

interface Counts {
  team: number;
  services: number;
  customers: number;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <span className="field__value">{value}</span>
    </div>
  );
}

function BookingRow({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="dash-field">
      <div className="dash-field-icon"><FontAwesomeIcon icon={faCalendarCheck} /></div>
      <div className="dash-field-body">
        <p className="dash-field-label">{title}</p>
        <p className="dash-field-value">{subtitle}</p>
      </div>
    </div>
  );
}

export default function ShopOverviewPage() {
  const { shop, isLoading } = useShop();
  const { t } = useLang();

  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [upcoming, setUpcoming] = useState<BookingWithStaff[]>([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!shop) return;
    setLoadingStats(true);
    Promise.all([
      listBookings(shop.id, { date: todayISO() }),
      getBookingStats(shop.id),
      getMembers(shop.id),
      getServices(shop.id),
      getCustomers(shop.id),
    ])
      .then(([today, stats, members, services, customers]) => {
        setTodayBookings(today);
        setUpcoming(stats.upcoming);
        setUpcomingCount(stats.upcomingCount);
        setCounts({ team: members.length, services: services.length, customers: customers.total });
      })
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, [shop?.id]);

  if (isLoading) return <div className="state-view">{t.overview.loading}</div>;
  if (!shop) return <div className="state-view">{t.overview.noShop}</div>;

  return (
    <div className="overview-page">
      <h1 className="overview-page__title">{t.overview.title}</h1>

      <div className="shop-overview-card">
        {/* ── Header ── */}
        <div className="shop-overview-card__header">
          <div className="shop-overview-card__header-text">
            <h2 className="shop-overview-card__name">{shop.name}</h2>
            {shop.description && (
              <p className="shop-overview-card__description">{shop.description}</p>
            )}
          </div>
          <div className="shop-overview-card__badges">
            <span className="badge badge--role">{shop.role}</span>
            <span className={`badge badge--status ${shop.isActive ? "badge--active" : "badge--inactive"}`}>
              {shop.isActive ? t.shops.active : t.shops.inactive}
            </span>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="shop-overview-card__body">
          {loadingStats ? (
            <div className="shops-spinner-wrap"><div className="spinner" /></div>
          ) : (
            <>
              <section className="field-group">
                <div className="field-group__grid">
                  <Field label={t.overview.teamLabel} value={counts?.team ?? 0} />
                  <Field label={t.overview.servicesLabel} value={counts?.services ?? 0} />
                  <Field label={t.overview.customersLabel} value={counts?.customers ?? 0} />
                </div>
              </section>

              <section className="field-group">
                <h3 className="field-group__title">{t.overview.todaysBookings}</h3>
                {todayBookings.length === 0 ? (
                  <p className="dash-field-value--muted">{t.overview.noBookingsToday}</p>
                ) : (
                  <div className="dash-fields">
                    {todayBookings.map((b) => (
                      <BookingRow
                        key={b.id}
                        title={b.customer.contactHidden ? t.customers.hiddenLabel : b.customer.name}
                        subtitle={`${b.service.name} — ${new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className="field-group">
                <h3 className="field-group__title">
                  {t.overview.upcomingBookings}{upcomingCount > 0 ? ` (${upcomingCount})` : ''}
                </h3>
                {upcoming.length === 0 ? (
                  <p className="dash-field-value--muted">{t.overview.noUpcoming}</p>
                ) : (
                  <div className="dash-fields">
                    {upcoming.map((b) => (
                      <BookingRow
                        key={b.id}
                        title={`${b.customer.contactHidden ? t.customers.hiddenLabel : b.customer.name} · ${b.staff.name}`}
                        subtitle={`${b.service.name} — ${new Date(b.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
