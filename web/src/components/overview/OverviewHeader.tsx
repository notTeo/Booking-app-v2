import { useLang } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import type { OverviewRange } from '../../api/overview.api';
import { firstName, greetingPeriod } from '../../utils/overviewFormat';
import RangeTabs from './RangeTabs';

interface Props {
  /** Timezone the greeting's time of day is computed in. */
  zone: string;
  range: OverviewRange;
  onRangeChange: (range: OverviewRange) => void;
}

const GREETING_KEYS = {
  morning: 'greetingMorning',
  afternoon: 'greetingAfternoon',
  evening: 'greetingEvening',
} as const;

/** Greeting bar with the Week | Month | 3 months switch. */
export default function OverviewHeader({ zone, range, onRangeChange }: Props) {
  const { t } = useLang();
  const { user } = useAuth();
  const greeting = t.overview[GREETING_KEYS[greetingPeriod(zone)]].replace(
    '{name}',
    firstName(user?.name ?? ''),
  );

  return (
    <div className="overview-head">
      <h1 className="t-title">{greeting}</h1>
      <RangeTabs value={range} onChange={onRangeChange} />
    </div>
  );
}
