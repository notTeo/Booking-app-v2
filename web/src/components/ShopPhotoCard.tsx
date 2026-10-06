import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage } from '@fortawesome/free-solid-svg-icons';
import { removeShopPhoto, setShopPhoto, type Shop } from '../api/shop.api';
import { useLang } from '../context/LanguageContext';
import { mediaUrl } from '../utils/media';
import PhotoField from './PhotoField';

/**
 * Shop settings: the shop's photo, shown at the top of its public booking
 * page. Unlike the colours and fonts it is saved as soon as the editor is.
 */
export default function ShopPhotoCard({
  shop,
  onSaved,
}: {
  shop: Shop;
  onSaved: (shop: Shop) => void;
}) {
  const { t } = useLang();
  const tp = t.photos;
  const src = mediaUrl(shop.photoUrl);

  return (
    <div className="card">
      <div className="card__header">
        <div>
          <h2 className="card__title">
            <FontAwesomeIcon icon={faImage} className="card__icon" />
            {tp.shopTitle}
          </h2>
          <p className="card__text">{tp.shopDesc}</p>
        </div>
      </div>
      <PhotoField
        photo={shop}
        shape="cover"
        stacked
        canEdit={shop.canEditShopSettings}
        preview={
          src ? (
            <div className="cover"><img src={src} alt={tp.shopAlt.replace('{name}', shop.name)} /></div>
          ) : (
            <div className="cover cover--empty">
              <span className="cover__empty">
                <FontAwesomeIcon icon={faImage} aria-hidden="true" />
                {tp.shopEmpty}
              </span>
            </div>
          )
        }
        onUpload={async (file, crop) => onSaved(await setShopPhoto(shop.id, file, crop))}
        onRemove={async () => onSaved(await removeShopPhoto(shop.id))}
      />
    </div>
  );
}
