import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare, faPlus } from '@fortawesome/free-solid-svg-icons';
import { getProducts, type Product } from '../api/product.api';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { PLAN_NAMES } from '../config/pricing';
import { apiErrorMessage } from '../utils/apiError';
import { handleRowClick } from '../utils/a11y';
import { canManageShop } from '../utils/roles';
import { formatPrice } from '../components/booking-wizard/wizardUtils';
import Alert from '../components/Alert';
import ProductThumb from '../components/ProductThumb';
import StockBadge from '../components/StockBadge';
import '../styles/pages/products.css';

/** The products the shop lists: one row each, opening the product's own page. */
export default function ShopProductsPage() {
  const { shop } = useShop();
  const { t } = useLang();
  const navigate = useNavigate();
  const tp = t.products;
  const shopId = shop?.id;
  const canManage = canManageShop(shop?.role);
  const inPlan = !!shop?.products;

  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!shopId) return;
    let live = true;
    getProducts(shopId)
      .then((list) => live && setProducts(list))
      .catch((err: unknown) => live && setError(apiErrorMessage(err, tp.errorLoad)));
    return () => {
      live = false;
    };
  }, [shopId, tp.errorLoad]);

  if (!shop) return null;

  return (
    <div className="products-page">
      <div className="page-header">
        <h1 className="t-title">{tp.title}</h1>
        {canManage && inPlan && (
          <Link to="new" className="btn">
            <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
            {tp.add}
          </Link>
        )}
      </div>

      {!inPlan && (
        <Alert
          variant="info"
          actions={<Link to="/contact" className="btn btn--secondary btn--sm">{t.shopPlan.contactUs}</Link>}
        >
          {tp.notInPlan.replace('{plan}', PLAN_NAMES[shop.plan])}
        </Alert>
      )}
      {error && <Alert variant="danger">{error}</Alert>}

      {products === null && !error ? (
        <div className="spinner-wrap"><div className="spinner" role="status" /></div>
      ) : products && products.length === 0 ? (
        <div className="empty empty--sm">
          <p className="empty__text">{tp.empty}</p>
          {inPlan && <p className="empty__text">{tp.emptyHint}</p>}
        </div>
      ) : (
        products && (
          <div className="table-wrap">
            <div className="table-surface">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">{tp.colProduct}</th>
                    <th scope="col">{tp.colPrice}</th>
                    <th scope="col">{tp.colStock}</th>
                    {canManage && <th scope="col">{tp.colSupplier}</th>}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="is-clickable" onClick={handleRowClick(() => navigate(p.id))}>
                      <td data-label={tp.colProduct} className="data-table__title">
                        <ProductThumb photoUrl={p.photoUrl} />
                        <Link to={p.id} className="data-table__link">{p.name}</Link>
                        {!p.isActive && <> <span className="badge badge--neutral">{tp.inactive}</span></>}
                      </td>
                      <td data-label={tp.colPrice}>{formatPrice(p.price)}</td>
                      <td data-label={tp.colStock}>
                        <StockBadge stock={p.stock} />
                      </td>
                      {canManage && (
                        <td data-label={tp.colSupplier}>
                          {p.supplierUrl ? (
                            <a href={p.supplierUrl} target="_blank" rel="noopener noreferrer" className="data-table__link">
                              <FontAwesomeIcon icon={faArrowUpRightFromSquare} aria-hidden="true" />{' '}
                              {tp.openSupplier}
                            </a>
                          ) : (
                            tp.noSupplier
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
