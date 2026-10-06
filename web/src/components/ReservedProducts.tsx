import type { ReservedProduct } from '../api/public.api';
import { useLang } from '../context/LanguageContext';
import { formatPrice } from './booking-wizard/wizardUtils';

/**
 * What a customer reserved with a booking: each line, then the service fee,
 * the products and the total, and the note that they pay in the shop.
 */
export default function ReservedProducts({
  products,
  servicePrice,
}: {
  products: ReservedProduct[];
  /** The service's fee in cents, so the total includes it. */
  servicePrice?: number;
}) {
  const { t } = useLang();
  if (products.length === 0) return null;
  const productsTotal = products.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0);
  return (
    <div className="reserved-products">
      <h3 className="t-subheading">{t.products.confirmationTitle}</h3>
      <ul className="list">
        {products.map((p, i) => (
          <li key={`${p.name}-${i}`} className="list__item">
            <span>{p.quantity} × {p.name}</span>
            <span>{formatPrice(p.quantity * p.unitPrice)}</span>
          </li>
        ))}
      </ul>
      <dl className="sum-up">
        {servicePrice !== undefined && (
          <div className="sum-up__row"><dt>{t.products.serviceFee}</dt><dd>{formatPrice(servicePrice)}</dd></div>
        )}
        <div className="sum-up__row"><dt>{t.products.productsSubtotal}</dt><dd>{formatPrice(productsTotal)}</dd></div>
        <div className="sum-up__row sum-up__row--total">
          <dt>{t.products.total}</dt>
          <dd>{formatPrice(productsTotal + (servicePrice ?? 0))}</dd>
        </div>
      </dl>
      <p className="t-body-sm t-muted">{t.products.payInShop}</p>
    </div>
  );
}
