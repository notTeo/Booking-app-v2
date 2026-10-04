import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faLocationDot, faStore, faUser, faUserGear } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../../context/LanguageContext';
import { ROLE_BADGE } from '../../utils/roles';
import type { ShopRole } from '../../api/shop.api';

const ROLE_ICON = { owner: faStore, manager: faUserGear, staff: faUser } as const;

export interface ShopCardRow {
  id: string;
  slug: string;
  name: string;
  role: ShopRole;
  address?: string;
}

/**
 * "All shops": one card per shop with the user's role and the shop's address,
 * linking to that shop. With no shops, `empty` takes the place of the cards.
 */
export default function ShopCards({ shops, empty }: { shops: ShopCardRow[]; empty: ReactNode }) {
  const { t } = useLang();

  return (
    <section className="shop-cards" aria-labelledby="dashboard-shops-title">
      <h2 className="t-subheading" id="dashboard-shops-title">{t.dashboard.shops.title}</h2>
      {shops.length === 0 && empty}
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
              {shop.address && (
                <span className="shop-card__label">
                  <FontAwesomeIcon icon={faLocationDot} aria-hidden="true" /> {shop.address}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
