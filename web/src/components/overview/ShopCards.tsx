import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../../context/LanguageContext';
import type { ShopOverviewRow } from '../../api/overview.api';

/** "Your shops": one card per shop, linking to that shop's overview. */
export default function ShopCards({ shops }: { shops: ShopOverviewRow[] }) {
  const { t } = useLang();
  const s = t.dashboard.shops;

  return (
    <section className="shop-cards" aria-labelledby="dashboard-shops-title">
      <h2 className="card__title" id="dashboard-shops-title">{s.title}</h2>
      <ul className="shop-cards__grid">
        {shops.map((shop) => (
          <li key={shop.shopId}>
            <Link to={`/shops/${shop.slug}`} className="card card--interactive shop-card">
              <span className="shop-card__head">
                <span className="shop-card__name">{shop.name}</span>
                <FontAwesomeIcon icon={faArrowRight} className="shop-card__arrow" aria-hidden="true" />
              </span>
              <span className="shop-card__metrics">
                <span className="shop-card__metric">
                  <span className="shop-card__value">{shop.total}</span>
                  <span className="shop-card__label">{s.bookings}</span>
                </span>
                <span className="shop-card__metric">
                  <span className="shop-card__value">{shop.today}</span>
                  <span className="shop-card__label">{s.today}</span>
                </span>
              </span>
              {shop.pending > 0 ? (
                <span className="badge badge--warning">{s.pending.replace('{count}', String(shop.pending))}</span>
              ) : (
                <span className="shop-card__label">{s.noPending}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
