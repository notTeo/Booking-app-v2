import { useState, type CSSProperties } from 'react';
import { useLang } from '../../context/LanguageContext';
import type { Overview } from '../../api/overview.api';
import { axisLabel, bucketLabel, isCurrentBucket, showsAxisLabel } from '../../utils/overviewFormat';

interface Props {
  overview: Overview;
  /** Shop-local today, "YYYY-MM-DD". */
  today: string;
}

export default function BookingsChart({ overview, today }: Props) {
  const { t, language } = useLang();
  const [active, setActive] = useState<number | null>(null);
  const { buckets, range } = overview;
  const max = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <section className="card" aria-labelledby="overview-chart-title">
      <div className="card__header">
        <h2 className="card__title" id="overview-chart-title">{t.overview.chart.title}</h2>
      </div>

      <div className="bar-chart">
        <div className="bar-chart__plot" role="group" aria-labelledby="overview-chart-title">
          {buckets.map((b, i) => {
            const label = bucketLabel(b, range, language);
            const noun = b.count === 1 ? t.overview.chart.bookingOne : t.overview.chart.bookingMany;
            const cls = [
              'bar-chart__col',
              isCurrentBucket(b, today) && 'bar-chart__col--current',
              b.count === 0 && 'bar-chart__col--empty',
              active === i && 'is-active',
            ].filter(Boolean).join(' ');
            return (
              <button
                key={b.start}
                type="button"
                className={cls}
                style={{ '--bar-h': `${(b.count / max) * 100}%` } as CSSProperties}
                aria-label={`${label}: ${b.count} ${noun}`}
                onClick={() => setActive(active === i ? null : i)}
                onBlur={() => setActive((a) => (a === i ? null : a))}
              >
                <span className="bar-chart__bar" />
                <span className="bar-chart__value" aria-hidden="true">{b.count}</span>
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
              {showsAxisLabel(i, buckets.length, range) && <span>{axisLabel(b, range, language)}</span>}
            </span>
          ))}
        </div>
      </div>

      <table className="visually-hidden">
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
              <th scope="row">{bucketLabel(b, range, language)}</th>
              <td>{b.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
