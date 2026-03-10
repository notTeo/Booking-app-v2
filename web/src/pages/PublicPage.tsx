import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type {  ShopInfo, ShopWorkingSchedule } from '../api/public.api';
import {getShopInfo} from '../api/public.api';
import '../styles/pages/public.css';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatPrice(p: number): string {
  return `$${p.toFixed(2)}`;
}

interface HoursEntry {
  day: number;
  hours: { openTime: string; closeTime: string }[];
}

function buildHoursDisplay(schedules: ShopWorkingSchedule[]): HoursEntry[] {
  const map = new Map<number, { openTime: string; closeTime: string }[]>();
  for (const schedule of schedules) {
    for (const day of schedule.days) {
      const existing = map.get(day.dayOfWeek) ?? [];
      map.set(day.dayOfWeek, [...existing, ...day.hours.map(h => ({ openTime: h.openTime, closeTime: h.closeTime }))]);
    }
  }
  return Array.from({ length: 7 }, (_, i) => ({ day: i, hours: map.get(i) ?? [] }));
}

export default function PublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    getShopInfo(slug)
      .then(setShop)
      .catch(() => setError('Shop not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="public-loading">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="public-error">
        <p>{error ?? 'Something went wrong'}</p>
      </div>
    );
  }

  const hoursDisplay = buildHoursDisplay(shop.shopWorkingSchedules);

  return (
    <div className="public-page">
      <header className="public-header">
        <div className="public-header-inner">
          <h1 className="public-shop-name">{shop.name}</h1>
          {shop.description && <p className="public-shop-desc">{shop.description}</p>}
          <div className="public-shop-meta">
            {shop.phone && <span>📞 {shop.phone}</span>}
            {shop.formattedAddress && <span>📍 {shop.formattedAddress}</span>}
            <span>🕐 {shop.timezone}</span>
          </div>
        </div>
      </header>

      <main className="public-main">
        {shop.services.length > 0 && (
          <section className="public-section">
            <h2 className="public-section-title">Services</h2>
            <div className="public-services-grid">
              {shop.services.map((s) => (
                <div key={s.id} className="public-service-card">
                  <div className="public-service-header">
                    <h3>{s.name}</h3>
                    <span className="public-service-price">{formatPrice(s.price)}</span>
                  </div>
                  {s.description && <p className="public-service-desc">{s.description}</p>}
                  <div className="public-service-duration">⏱ {formatDuration(s.duration)}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {shop.shopWorkingSchedules.length > 0 && (
          <section className="public-section">
            <h2 className="public-section-title">Hours</h2>
            <div className="public-hours-list">
              {hoursDisplay.map(({ day, hours }) => (
                <div key={day} className="public-hours-row">
                  <span className="public-hours-day">{DAY_NAMES[day]}</span>
                  {hours.length === 0 ? (
                    <span className="public-hours-closed">Closed</span>
                  ) : (
                    <span className="public-hours-time">
                      {hours.map((h) => `${formatTime(h.openTime)} – ${formatTime(h.closeTime)}`).join(', ')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {shop.members.length > 0 && (
          <section className="public-section">
            <h2 className="public-section-title">Our Team</h2>
            <div className="public-team-grid">
              {shop.members.map((m) => (
                <div key={m.id} className="public-team-card">
                  <div className="public-team-avatar">
                    {m.user.name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div className="public-team-info">
                    <h3>{m.user.name}</h3>
                    <span className="public-team-role">{m.role}</span>
                    {m.staffServices.length > 0 && (
                      <div className="public-team-services">
                        {m.staffServices.map((ss) => (
                          <span key={ss.service.id} className="public-team-service-tag">
                            {ss.service.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
