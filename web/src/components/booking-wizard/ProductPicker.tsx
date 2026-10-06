import { useId } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import type { PublicProduct } from '../../api/public.api';
import { useLang } from '../../context/LanguageContext';
import ProductThumb from '../ProductThumb';
import StockBadge from '../StockBadge';
import { formatPrice } from './wizardUtils';
import { toProductLines } from '../../utils/productLines';

const MAX_PER_PRODUCT = 99;

/**
 * Reserve products with a booking: a quantity stepper per product, the total
 * and the note that nothing is paid online. Customers cannot go past the
 * stock; the owner and managers can (`canOverStock`), after a warning.
 */
export default function ProductPicker({
  products,
  value,
  onChange,
  canOverStock = false,
  showHint = true,
  servicePrice,
}: {
  products: PublicProduct[];
  /** Quantity per product id. */
  value: Record<string, number>;
  onChange: (value: Record<string, number>) => void;
  canOverStock?: boolean;
  showHint?: boolean;
  /** The chosen service's fee in cents: shown in the sum-up so the total includes it. */
  servicePrice?: number;
}) {
  const { t } = useLang();
  const tp = t.products;
  const id = useId();
  if (products.length === 0) return null;

  const set = (productId: string, quantity: number) =>
    onChange({ ...value, [productId]: Math.max(0, quantity) });
  const total = products.reduce((sum, p) => sum + (value[p.id] ?? 0) * p.price, 0);
  const chosen = toProductLines(value).length > 0;

  return (
    <section className="product-picker" aria-labelledby={`${id}-title`}>
      <h3 className="t-subheading" id={`${id}-title`}>{tp.pickerTitle}</h3>
      {showHint && <p className="field__hint">{tp.pickerHint}</p>}
      <ul className="list product-list">
        {products.map((p) => {
          const quantity = value[p.id] ?? 0;
          const unavailable = p.stock <= 0 && !canOverStock;
          const atLimit = !canOverStock && quantity >= p.stock;
          return (
            <li key={p.id} className="product-row">
              <ProductThumb photoUrl={p.photoUrl} />
              <div className="product-row__main">
                <span className="product-row__name">{p.name}</span>
                {p.description && <span className="t-body-sm t-muted">{p.description}</span>}
                <span className="cluster cluster--tight">
                  <span className="product-row__price">{formatPrice(p.price)}</span>
                  <StockBadge stock={p.stock} />
                </span>
              </div>
              {!unavailable && (
                <div className="stepper" role="group" aria-label={tp.quantity.replace('{name}', p.name)}>
                  <button
                    type="button"
                    className="btn btn--secondary btn--icon"
                    aria-label={tp.decrease.replace('{name}', p.name)}
                    disabled={quantity <= 0}
                    onClick={() => set(p.id, quantity - 1)}
                  >
                    <FontAwesomeIcon icon={faMinus} aria-hidden="true" />
                  </button>
                  <span className="stepper__value" aria-live="polite">{quantity}</span>
                  <button
                    type="button"
                    className="btn btn--secondary btn--icon"
                    aria-label={tp.increase.replace('{name}', p.name)}
                    disabled={atLimit || quantity >= MAX_PER_PRODUCT}
                    onClick={() => set(p.id, quantity + 1)}
                  >
                    <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {chosen && (
        <>
          <dl className="sum-up">
            {servicePrice !== undefined && (
              <div className="sum-up__row"><dt>{tp.serviceFee}</dt><dd>{formatPrice(servicePrice)}</dd></div>
            )}
            <div className="sum-up__row"><dt>{tp.productsSubtotal}</dt><dd>{formatPrice(total)}</dd></div>
            <div className="sum-up__row sum-up__row--total">
              <dt>{tp.total}</dt>
              <dd>{formatPrice(total + (servicePrice ?? 0))}</dd>
            </div>
          </dl>
          <p className="t-body-sm t-muted">{tp.payInShop}</p>
        </>
      )}
    </section>
  );
}
