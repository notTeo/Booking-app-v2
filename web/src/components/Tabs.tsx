import { useRef, type KeyboardEvent } from 'react';
import { tabButtonId, tabPanelId } from '../utils/tabIds';

export interface TabItem<T extends string> {
  id: T;
  label: string;
}

/**
 * A row of tabs over one panel, with the usual keyboard behaviour (arrows,
 * Home, End). The page renders the panel itself, with `tabPanelId` (utils/tabIds.ts) as its id.
 */
export default function Tabs<T extends string>({
  label,
  idPrefix,
  tabs,
  value,
  onChange,
}: {
  /** What the tabs are, for screen readers. */
  label: string;
  idPrefix: string;
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    const next =
      e.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className="tabs">
      {tabs.map((tab, i) => (
        <button
          key={tab.id}
          ref={(el) => { refs.current[i] = el; }}
          type="button"
          role="tab"
          id={tabButtonId(idPrefix, tab.id)}
          className="tab"
          aria-selected={value === tab.id}
          aria-controls={tabPanelId(idPrefix)}
          tabIndex={value === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
