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
  /** Shown instead of the grid when nothing has ever been booked. */
  neverBooked: ReactNode;
}

/**
 * Everything under the shop overview's header: error / skeleton / the grid
 * (chart and upcoming on the left, stat tiles and breakdown on the right).
 */
export default function OverviewBody({ range, overview, isError, onRetry, upcoming, neverBooked }: Props) {
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
        periodIsEmpty && !overview.hasAnyBookings ? (
          <>
            <StatCards totals={overview.totals} />
            {neverBooked}
          </>
        ) : (
          <div className={`overview-grid${periodIsEmpty ? ' overview-grid--no-breakdown' : ''}`}>
            <div className="overview-grid__stats">
              <StatCards totals={overview.totals} tiles />
            </div>
            <div className="overview-grid__chart">
              {periodIsEmpty ? <PeriodEmpty range={overview.range} /> : <BookingsChart overview={overview} />}
            </div>
            {upcoming}
            {!periodIsEmpty && <StatusDonut totals={overview.totals} />}
          </div>
        )
      )}
    </div>
  );
}
