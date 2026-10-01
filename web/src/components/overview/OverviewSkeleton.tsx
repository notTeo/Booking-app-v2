import { useLang } from '../../context/LanguageContext';
import { RecentBookingsSkeleton } from './RecentBookings';

/** Same layout as the loaded dashboard: stat cards, chart, table, breakdown. */
export default function OverviewSkeleton() {
  const { t } = useLang();
  return (
    <div className="overview-page" aria-busy="true">
      <span className="visually-hidden" role="status">{t.overview.loadingLabel}</span>
      <div className="stat-grid" aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card stat">
            <span className="skeleton skeleton--avatar" />
            <span className="skeleton skeleton--title" />
            <span className="skeleton skeleton--text" />
          </div>
        ))}
      </div>
      <div className="overview-grid" aria-hidden="true">
        <div className="card overview-grid__chart">
          <span className="skeleton skeleton--title" />
          <span className="skeleton skeleton--block" />
          <span className="skeleton skeleton--text" />
        </div>
        <div className="overview-grid__recent">
          <span className="skeleton skeleton--title" />
          <RecentBookingsSkeleton />
        </div>
        <div className="card overview-grid__breakdown">
          <span className="skeleton skeleton--title" />
          <span className="skeleton skeleton--avatar" />
          <span className="skeleton skeleton--block" />
        </div>
      </div>
    </div>
  );
}
