import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faCircleExclamation,
  faCircleXmark,
} from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import { STOCK_BADGE, stockLevel, stockText, type StockLevel } from '../utils/stock';

const ICON = {
  out: faCircleXmark,
  last: faCircleExclamation,
  low: faCircleExclamation,
  ok: faCircleCheck,
} as const satisfies Record<StockLevel, unknown>;

/** A product's stock as an icon and a word ("Not available", "Last one", "Only 3 left", "In stock"). */
export default function StockBadge({ stock }: { stock: number }) {
  const { t } = useLang();
  const level = stockLevel(stock);
  return (
    <span className={`badge ${STOCK_BADGE[level]}`}>
      <FontAwesomeIcon icon={ICON[level]} aria-hidden="true" />
      {stockText(t.products, stock)}
    </span>
  );
}
