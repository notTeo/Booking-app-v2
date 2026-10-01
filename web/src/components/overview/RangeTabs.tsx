import { useRef, type KeyboardEvent } from 'react';
import { useLang } from '../../context/LanguageContext';
import type { OverviewRange } from '../../api/overview.api';
import { PANEL_ID, RANGES, tabId } from '../../utils/overviewRanges';


interface Props {
  value: OverviewRange;
  onChange: (range: OverviewRange) => void;
}

export default function RangeTabs({ value, onChange }: Props) {
  const { t } = useLang();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const last = RANGES.length - 1;
    const next =
      e.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    onChange(RANGES[next]);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label={t.overview.rangeLabel} className="tabs tabs--segmented tabs--fill-mobile">
      {RANGES.map((range, i) => (
        <button
          key={range}
          ref={(el) => { refs.current[i] = el; }}
          type="button"
          role="tab"
          id={tabId(range)}
          className="tab"
          aria-selected={value === range}
          aria-controls={PANEL_ID}
          tabIndex={value === range ? 0 : -1}
          onClick={() => onChange(range)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {t.overview.range[range]}
        </button>
      ))}
    </div>
  );
}
