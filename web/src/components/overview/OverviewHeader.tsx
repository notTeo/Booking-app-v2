import type { ReactNode } from 'react';
import { useLang } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import type { OverviewRange } from '../../api/overview.api';
import { firstName, greetingPeriod } from '../../utils/overviewFormat';
import RangeTabs from './RangeTabs';

interface Props {
  /** Timezone the greeting's time of day is computed in. */
  zone: string;
  /** With both, the Week | Month | 3 months switch sits on the right. */
  range?: OverviewRange;
  onRangeChange?: (range: OverviewRange) => void;
  /** Otherwise this goes on the right (e.g. the dashboard's plan pill). */
  action?: ReactNode;
}

const GREETING_KEYS = {
  morning: 'greetingMorning',
  afternoon: 'greetingAfternoon',
  evening: 'greetingEvening',
} as const;

/** Greeting bar with the Week | Month | 3 months switch, or an action. */
export default function OverviewHeader({ zone, range, onRangeChange, action }: Props) {
  const { t } = useLang();
  const { user } = useAuth();
  const greeting = t.overview[GREETING_KEYS[greetingPeriod(zone)]].replace(
    '{name}',
    firstName(user?.name ?? ''),
  );

  return (
    <div className="overview-head">
      <h1 className="t-title">{greeting}</h1>
      {range && onRangeChange ? <RangeTabs value={range} onChange={onRangeChange} /> : action}
    </div>
  );
}
