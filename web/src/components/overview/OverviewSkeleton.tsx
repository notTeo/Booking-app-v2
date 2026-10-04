import { useLang } from '../../context/LanguageContext';
import { UpcomingBookingsSkeleton } from './UpcomingBookings';

/** Same layout as the loaded overview: chart and table, stat tiles and breakdown. */
export default function OverviewSkeleton() {
  const { t } = useLang();
  return (
    <div className="overview-page" aria-busy="true">
      <span className="visually-hidden" role="status">{t.overview.loadingLabel}</span>
      <div className="overview-grid" aria-hidden="true">
        <div className="overview-grid__stats">
          <div className="stat-grid stat-grid--tiles">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="card stat stat--tile">
                <span className="skeleton skeleton--avatar" />
                <span className="skeleton skeleton--title" />
                <span className="skeleton skeleton--text" />
              </div>
            ))}
          </div>
        </div>
        <div className="card overview-grid__chart">
          <span className="skeleton skeleton--title" />
          <span className="skeleton skeleton--block" />
          <span className="skeleton skeleton--text" />
        </div>
        <div className="overview-grid__upcoming">
          <span className="skeleton skeleton--title" />
          <UpcomingBookingsSkeleton />
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
