import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarCheck } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../../context/LanguageContext';
import type { OverviewRange } from '../../api/overview.api';

export default function OverviewEmpty({ link }: { link: string }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (insecure origin / permissions); the button stays usable.
    }
  };

  return (
    <div className="card">
      <div className="empty">
        <span className="empty__icon"><FontAwesomeIcon icon={faCalendarCheck} aria-hidden="true" /></span>
        <h2 className="empty__title">{t.overview.empty.title}</h2>
        <p className="empty__text">{t.overview.empty.text}</p>
        <div className="empty__actions">
          <button type="button" className="btn" onClick={copy}>{t.overview.empty.copy}</button>
        </div>
        <span className="visually-hidden" role="status">{copied ? t.overview.empty.copied : ''}</span>
      </div>
    </div>
  );
}

/** The shop has bookings, just none in the selected period. */
export function PeriodEmpty({ range }: { range: OverviewRange }) {
  const { t } = useLang();
  return (
    <div className="card">
      <div className="empty empty--sm">
        <p className="empty__text">{t.overview.empty[range]}</p>
      </div>
    </div>
  );
}
