import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../../context/LanguageContext';
import { getProducts, type Product } from '../../api/product.api';
import { formatServicePrice } from '../../utils/serviceForm';
import Alert from '../Alert';
import ProductFormModal from '../ProductFormModal';
import ProductThumb from '../ProductThumb';
import { WizardFooter, WizardIntro } from './Wizard';
import type { SetupStepProps } from './steps';

// Optional, and said so: most shops add products later. With none added the
// main button is the way past ("Continue without products").
export default function ProductsStep({ shop, frame, onNext, onBack }: SetupStepProps) {
  const { t } = useLang();
  const to = t.onboarding;
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let live = true;
    getProducts(shop.id)
      .then((list) => live && setProducts(list))
      .catch(() => live && setError(to.errorLoad));
    return () => {
      live = false;
    };
  }, [shop.id, to.errorLoad]);

  const none = !products?.length;

  return frame(
    <WizardFooter onBack={onBack} main={{ label: none ? to.products.continueWithout : to.continue, onClick: onNext }} />,
    <>
      <WizardIntro title={to.products.title} text={to.products.intro} badge={to.optional} />
      {error && <Alert variant="danger">{error}</Alert>}
      {notice && <Alert variant="warning">{notice}</Alert>}
      {products === null && !error && <div className="spinner-wrap"><div className="spinner" role="status" /></div>}
      {products && products.length > 0 && (
        <div className="card">
          <ul className="list product-list">
            {products.map((product) => (
              <li key={product.id} className="list__item product-row">
                <ProductThumb photoUrl={product.photoUrl} />
                <span className="product-row__main">
                  <span className="product-row__name">{product.name}</span>
                  <span className="cluster cluster--tight">
                    <span className="badge badge--neutral">{formatServicePrice(product.price)}</span>
                    <span className="badge badge--neutral">{to.products.inStock.replace('{n}', String(product.stock))}</span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button type="button" className="card card--dashed" onClick={() => { setNotice(''); setAdding(true); }}>
        <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
        {to.products.add}
      </button>
      {adding && (
        <ProductFormModal
          shopId={shop.id}
          onCreated={(product, photoFailed) => {
            setProducts((prev) => [...(prev ?? []), product]);
            setNotice(photoFailed ? to.products.photoFailed : '');
            setAdding(false);
          }}
          onClose={() => setAdding(false)}
        />
      )}
    </>,
  );
}
