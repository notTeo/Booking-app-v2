import { Link, Outlet } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStore } from '@fortawesome/free-solid-svg-icons';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import Alert from './Alert';

// Layout route for the shop pages that need a resolved shop. Without it, a
// page whose data effect waits for `shop` spins forever when the shop never
// resolves (unknown slug, deactivated member, failed lookup).
export default function ShopGate() {
  const { shop, isLoading, error, refetch } = useShop();
  const { t } = useLang();

  if (isLoading) {
    return (
      <div className="shops-spinner-wrap">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        variant="danger"
        actions={
          <button type="button" className="btn btn--secondary btn--sm" onClick={refetch}>
            {t.shopGate.retry}
          </button>
        }
      >
        {t.shopGate.errorLoad}
      </Alert>
    );
  }

  if (!shop) {
    return (
      <div className="empty">
        <div className="empty__icon">
          <FontAwesomeIcon icon={faStore} aria-hidden="true" />
        </div>
        <h2 className="empty__title">{t.shopGate.notFoundTitle}</h2>
        <p className="empty__text">{t.shopGate.notFoundText}</p>
        <div className="empty__actions">
          <Link className="btn" to="/shops">
            {t.shopGate.backToShops}
          </Link>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
