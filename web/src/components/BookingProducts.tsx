import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faMinus, faPlus, faTrashCan, faXmark } from '@fortawesome/free-solid-svg-icons';
import {
  getApiError,
  PRODUCT_OUT_OF_STOCK,
  removeBookingProductLine,
  updateBookingProductLine,
  type BookingProductChange,
  type BookingProductLine,
} from '../api/booking.api';
import { useLang } from '../context/LanguageContext';
import Alert from './Alert';
import ConfirmDialog from './ConfirmDialog';
import ProductThumb from './ProductThumb';
import { formatPrice } from './booking-wizard/wizardUtils';

const MAX_QUANTITY = 99;

type Change = { saleStatus?: BookingProductLine['saleStatus']; quantity?: number } | 'remove';

/**
 * The products reserved with a booking. Read-only by default: each product
 * with its quantity and price (a line at 0 no longer counts, so it is left
 * out). In `editing` mode: change the quantity, remove a product, and mark
 * each Sold or Not sold. Marking one sold takes it out of the product's stock;
 * marking it not sold gives it back (the server does the counting).
 */
export default function BookingProducts({
  shopId,
  bookingId,
  products,
  editing,
  onChange,
}: {
  shopId: string;
  bookingId: string;
  products: BookingProductLine[];
  editing: boolean;
  onChange: (change: BookingProductChange) => void;
}) {
  const { t } = useLang();
  const tp = t.products;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<BookingProductLine | null>(null);

  const change = async (line: BookingProductLine, body: Change) => {
    if (busyId) return;
    setBusyId(line.id);
    setError('');
    try {
      onChange(
        body === 'remove'
          ? await removeBookingProductLine(shopId, bookingId, line.id)
          : await updateBookingProductLine(shopId, bookingId, line.id, body),
      );
    } catch (err) {
      setError(getApiError(err).code === PRODUCT_OUT_OF_STOCK ? tp.outOfStockError : tp.errorSale);
    } finally {
      setBusyId(null);
      setRemoving(null);
    }
  };

  const shown = editing ? products : products.filter((l) => l.quantity > 0);

  return (
    <>
      <ul className="list product-list">
        {shown.map((line) => (
          <li key={line.id} className={`product-row${line.quantity === 0 ? ' product-row--zero' : ''}`}>
            <ProductThumb photoUrl={line.product?.photoUrl} />
            <div className="product-row__main">
              <span className="product-row__name">
                {line.name} <span className="t-muted">× {line.quantity}</span>
              </span>
              {!editing && line.saleStatus !== 'RESERVED' && (
                <span>
                  <span className={`badge ${line.saleStatus === 'SOLD' ? 'badge--success' : 'badge--neutral'}`}>
                    <FontAwesomeIcon icon={line.saleStatus === 'SOLD' ? faCheck : faXmark} aria-hidden="true" />
                    {line.saleStatus === 'SOLD' ? t.bookings.detail.soldBadge : t.bookings.detail.notSoldBadge}
                  </span>
                </span>
              )}
              {editing && (
                <>
                  <span className="t-body-sm t-muted">
                    {formatPrice(line.unitPrice)}
                    {line.product
                      ? ` · ${tp.leftInStock.replace('{n}', String(line.product.stock))}`
                      : ` · ${tp.deletedProduct}`}
                  </span>
                  {line.quantity === 0 && <span className="t-body-sm">{tp.zeroNote}</span>}
                  <div className="cluster cluster--tight">
                    <div className="stepper" role="group" aria-label={tp.quantity.replace('{name}', line.name)}>
                      <button
                        type="button"
                        className="btn btn--secondary btn--icon"
                        aria-label={tp.decrease.replace('{name}', line.name)}
                        disabled={busyId === line.id || line.quantity <= 0}
                        onClick={() => change(line, { quantity: line.quantity - 1 })}
                      >
                        <FontAwesomeIcon icon={faMinus} aria-hidden="true" />
                      </button>
                      <span className="stepper__value" aria-live="polite">{line.quantity}</span>
                      <button
                        type="button"
                        className="btn btn--secondary btn--icon"
                        aria-label={tp.increase.replace('{name}', line.name)}
                        disabled={busyId === line.id || line.quantity >= MAX_QUANTITY}
                        onClick={() => change(line, { quantity: line.quantity + 1 })}
                      >
                        <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn btn--danger-outline btn--icon"
                      aria-label={tp.removeLine.replace('{name}', line.name)}
                      disabled={busyId === line.id}
                      onClick={() => setRemoving(line)}
                    >
                      <FontAwesomeIcon icon={faTrashCan} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="cluster cluster--tight">
                    <button
                      type="button"
                      className={`btn btn--sm ${line.saleStatus === 'SOLD' ? '' : 'btn--secondary'}`}
                      aria-pressed={line.saleStatus === 'SOLD'}
                      disabled={busyId === line.id}
                      // Pressing the active button again goes back to merely reserved.
                      onClick={() => change(line, { saleStatus: line.saleStatus === 'SOLD' ? 'RESERVED' : 'SOLD' })}
                    >
                      <FontAwesomeIcon icon={faCheck} aria-hidden="true" />
                      {tp.sold}
                    </button>
                    <button
                      type="button"
                      className={`btn btn--sm ${line.saleStatus === 'NOT_SOLD' ? '' : 'btn--secondary'}`}
                      aria-pressed={line.saleStatus === 'NOT_SOLD'}
                      disabled={busyId === line.id}
                      onClick={() => change(line, { saleStatus: line.saleStatus === 'NOT_SOLD' ? 'RESERVED' : 'NOT_SOLD' })}
                    >
                      <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
                      {tp.notSold}
                    </button>
                  </div>
                </>
              )}
            </div>
            {!editing && <span className="product-row__price">{formatPrice(line.quantity * line.unitPrice)}</span>}
          </li>
        ))}
      </ul>
      {error && <Alert variant="danger">{error}</Alert>}
      {removing && (
        <ConfirmDialog
          title={tp.removeLineTitle}
          message={tp.removeLineMessage}
          confirmLabel={tp.delete}
          cancelLabel={tp.cancel}
          tone="danger"
          busy={busyId === removing.id}
          onConfirm={() => change(removing, 'remove')}
          onCancel={() => setRemoving(null)}
        />
      )}
    </>
  );
}
