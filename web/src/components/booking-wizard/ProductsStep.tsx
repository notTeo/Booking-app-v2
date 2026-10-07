import type { PublicProduct } from '../../api/public.api';
import { useLang } from '../../context/LanguageContext';
import { exceedsStock } from '../../utils/productLines';
import Alert from '../Alert';
import ProductPicker from './ProductPicker';

/**
 * The step before the details, when the shop has products on offer: reserve
 * some with the booking, or go on with none.
 */
export default function ProductsStep({
  products,
  value,
  onChange,
  canOverStock = false,
  servicePrice,
  onBack,
  onContinue,
  hideActions,
}: {
  products: PublicProduct[];
  /** Quantity per product id. */
  value: Record<string, number>;
  onChange: (value: Record<string, number>) => void;
  /** Owner and managers may reserve more than what is left, after a warning. */
  canOverStock?: boolean;
  /** The chosen service's fee in cents, for the sum-up. */
  servicePrice?: number;
  onBack: () => void;
  onContinue: () => void;
  /** The public page has its own Back / Continue in the card's footer. */
  hideActions?: boolean;
}) {
  const { t } = useLang();
  return (
    <div className="public-wizard-panel">
      <ProductPicker
        products={products}
        value={value}
        onChange={onChange}
        canOverStock={canOverStock}
        servicePrice={servicePrice}
        // On the public page the step's heading already says "Products".
        showTitle={!hideActions}
        showHint={!!hideActions}
      />
      {canOverStock && exceedsStock(products, value) && <Alert variant="warning">{t.products.overStock}</Alert>}
      {!hideActions && (
        <div className="cluster public-wizard-actions">
          <button className="btn btn--ghost" onClick={onBack}>{t.public.back}</button>
          <button className="btn" onClick={onContinue}>{t.public.continue}</button>
        </div>
      )}
    </div>
  );
}
