import { useState, type CSSProperties } from 'react';
import { useLang } from '../../context/LanguageContext';
import type { Overview } from '../../api/overview.api';
import {
  axisLabel,
  bucketLabel,
  isCurrentBucket,
  isScheduledBucket,
  showsAxisLabel,
} from '../../utils/overviewFormat';

export default function BookingsChart({ overview }: { overview: Overview }) {
  const { t, language } = useLang();
  const [active, setActive] = useState<number | null>(null);
  const { buckets, range, today } = overview;
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const hasScheduled = buckets.some((b) => isScheduledBucket(b, today));

  return (
    <section className="card" aria-labelledby="overview-chart-title">
      <div className="card__header">
        <h2 className="card__title" id="overview-chart-title">
          {t.overview.chart.title}
        </h2>
      </div>

      <div className="bar-chart">
        <div
          className="bar-chart__plot"
          role="group"
          aria-labelledby="overview-chart-title"
        >
          {buckets.map((b, i) => {
            const label = bucketLabel(b, range, language);
            const noun =
              b.count === 1
                ? t.overview.chart.bookingOne
                : t.overview.chart.bookingMany;
            const scheduled = isScheduledBucket(b, today);
            const cls = [
              'bar-chart__col',
              isCurrentBucket(b, today) && 'bar-chart__col--current',
              scheduled && 'bar-chart__col--scheduled',
              b.count === 0 && 'bar-chart__col--empty',
              active === i && 'is-active',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={b.start}
                type="button"
                className={cls}
                style={
                  { '--bar-h': `${(b.count / max) * 100}%` } as CSSProperties
                }
                aria-label={`${label}: ${b.count} ${noun}${scheduled ? `, ${t.overview.chart.scheduled}` : ''}`}
                onClick={() => setActive(active === i ? null : i)}
                onBlur={() => setActive((a) => (a === i ? null : a))}
              >
                <span className="bar-chart__bar" />
                <span className="bar-chart__value" aria-hidden="true">
                  {b.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="bar-chart__axis" aria-hidden="true">
          {buckets.map((b, i) => (
            <span
              key={b.start}
              className={`bar-chart__tick${isCurrentBucket(b, today) ? ' bar-chart__tick--current' : ''}`}
            >
              {showsAxisLabel(i, range) && (
                <span>{axisLabel(b, range, language)}</span>
              )}
            </span>
          ))}
        </div>
        {hasScheduled && (
          <p className="bar-chart__key" aria-hidden="true">
            <span className="bar-chart__swatch" />
            {t.overview.chart.scheduled}
          </p>
        )}
      </div>

      {/* The wrapper does the clipping: a bare table ignores width/overflow. */}
      <div className="visually-hidden">
        <table>
          <caption>{t.overview.chart.tableCaption}</caption>
          <thead>
            <tr>
              <th scope="col">{t.overview.chart.periodCol}</th>
              <th scope="col">{t.overview.chart.countCol}</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.start}>
                <th scope="row">
                  {bucketLabel(b, range, language)}
                  {isScheduledBucket(b, today) &&
                    ` (${t.overview.chart.scheduled})`}
                </th>
                <td>{b.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
