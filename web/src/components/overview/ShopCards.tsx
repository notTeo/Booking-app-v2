import { Link } from 'react-router-dom';
import { ROLE_BADGE } from '../../utils/roles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faClock, faStore, faUser, faUserGear } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../../context/LanguageContext';
import type { ShopRole } from '../../api/shop.api';
import type { ShopOverviewRow } from '../../api/overview.api';

const ROLE_ICON = { owner: faStore, manager: faUserGear, staff: faUser } as const;

export interface ShopCardRow {
  id: string;
  slug: string;
  name: string;
  role: ShopRole;
  /** This shop's numbers from the cross-shop overview, when it is shown. */
  metrics?: Pick<ShopOverviewRow, 'total' | 'today' | 'pending'>;
}

/** "Your shops": one card per shop with the user's role, linking to that shop. */
export default function ShopCards({ shops }: { shops: ShopCardRow[] }) {
  const { t } = useLang();
  const s = t.dashboard.shops;

  return (
    <section className="shop-cards" aria-labelledby="dashboard-shops-title">
      <h2 className="t-subheading" id="dashboard-shops-title">{s.title}</h2>
      <ul className="shop-cards__grid">
        {shops.map((shop) => (
          <li key={shop.id}>
            <Link to={`/shops/${shop.slug}`} className="card card--interactive shop-card">
              <span className="shop-card__head">
                <span className="shop-card__name">{shop.name}</span>
                <FontAwesomeIcon icon={faArrowRight} className="shop-card__arrow" aria-hidden="true" />
              </span>
              <span className={`badge ${ROLE_BADGE[shop.role]}`}>
                <FontAwesomeIcon icon={ROLE_ICON[shop.role]} aria-hidden="true" />
                {t.invites.roles[shop.role]}
              </span>
              {shop.metrics && (
                <>
                  <span className="shop-card__metrics">
                    <span className="shop-card__metric">
                      <span className="shop-card__value">{shop.metrics.total}</span>
                      <span className="shop-card__label">{s.bookings}</span>
                    </span>
                    <span className="shop-card__metric">
                      <span className="shop-card__value">{shop.metrics.today}</span>
                      <span className="shop-card__label">{s.today}</span>
                    </span>
                  </span>
                  {shop.metrics.pending > 0 ? (
                    <span className="badge badge--warning">
                      <FontAwesomeIcon icon={faClock} aria-hidden="true" />
                      {s.pending.replace('{count}', String(shop.metrics.pending))}
                    </span>
                  ) : (
                    <span className="shop-card__label">{s.noPending}</span>
                  )}
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
