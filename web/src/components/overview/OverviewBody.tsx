import type { ReactNode } from 'react';
import { useLang } from '../../context/LanguageContext';
import type { Overview, OverviewRange } from '../../api/overview.api';
import { PANEL_ID, tabId } from '../../utils/overviewRanges';
import Alert from '../Alert';
import StatCards from './StatCards';
import BookingsChart from './BookingsChart';
import StatusDonut from './StatusDonut';
import OverviewSkeleton from './OverviewSkeleton';
import { PeriodEmpty } from './OverviewEmpty';

interface Props {
  /** The selected range; labels the tab panel even while loading. */
  range: OverviewRange;
  overview: Overview | undefined;
  isError: boolean;
  onRetry: () => void;
  /** The upcoming-bookings section (already wired to its own query). */
  upcoming: ReactNode;
  /** Shown instead of the chart grid when nothing has ever been booked. */
  neverBooked: ReactNode;
  /** Rendered below the grid once the overview has loaded (e.g. "Your shops"). */
  footer?: ReactNode;
}

/**
 * Everything under the header, shared by the shop overview and the dashboard:
 * error / skeleton / stat cards / chart + upcoming + breakdown.
 */
export default function OverviewBody({ range, overview, isError, onRetry, upcoming, neverBooked, footer }: Props) {
  const { t } = useLang();
  const periodIsEmpty = !!overview && overview.totals.all + overview.totals.canceled === 0;

  return (
    <div role="tabpanel" id={PANEL_ID} aria-labelledby={tabId(range)} className="overview-page">
      {isError ? (
        <Alert
          variant="danger"
          title={t.overview.error.title}
          actions={
            <button type="button" className="btn btn--secondary btn--sm" onClick={onRetry}>
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
              neverBooked
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
          {footer}
        </>
      )}
    </div>
  );
}
