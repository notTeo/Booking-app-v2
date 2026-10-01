import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStore } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../../context/LanguageContext';

/** The dashboard of a user without shops. Creating one is a Pro feature, as on the shops page. */
export default function NoShopsEmpty({ canCreate }: { canCreate: boolean }) {
  const { t } = useLang();
  return (
    <div className="card">
      <div className="empty">
        <span className="empty__icon"><FontAwesomeIcon icon={faStore} aria-hidden="true" /></span>
        <h2 className="empty__title">{t.dashboard.empty.title}</h2>
        <p className="empty__text">{t.dashboard.empty.text}</p>
        <div className="empty__actions">
          {canCreate ? (
            <Link to="/shops/new" className="btn btn--primary">{t.shops.createFirstShop}</Link>
          ) : (
            <p className="empty__text">{t.shops.upgradeToCreate}</p>
          )}
        </div>
      </div>
    </div>
  );
}
