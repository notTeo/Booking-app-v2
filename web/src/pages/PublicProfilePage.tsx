import { useEffect, useId, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getShopInfo, submitCustomerProfile, type ShopInfo } from '../api/public.api';
import { useLang } from '../context/LanguageContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { SITE_NAME } from '../config/seo';
import { apiErrorMessage } from '../utils/apiError';
import { parsePublicFont, parsePublicPalette } from '../utils/branding';
import { mediaUrl } from '../utils/media';
import { isPlausiblePhone } from '../utils/phone';
import { isPlausibleSlug, publicProfilePath, publicShopPath } from '../utils/publicLink';
import { rememberPhotoAdded } from '../utils/savedCustomer';
import Alert from '../components/Alert';
import CustomerPhotoPicker, { type PickedPhoto } from '../components/CustomerPhotoPicker';
import LangSwitch from '../components/LangSwitch';
import PublicPalette from '../components/PublicPalette';
import SuccessCheck from '../components/SuccessCheck';
import NotFoundPage from './NotFoundPage';
import '../styles/pages/public.css';

// The shop's customer sign-up page (/<slug>/profile), usually opened from the
// QR code the shop prints. A customer leaves their name and phone, and a photo
// if the shop takes them. It only ever adds to what the shop has.
export default function PublicProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug || !isPlausibleSlug(slug)) return <NotFoundPage />;
  return <ProfileForm slug={slug} />;
}

function ProfileForm({ slug }: { slug: string }) {
  const uid = useId();
  const { t } = useLang();
  const c = t.customerProfile;

  // undefined while loading, null when there is no such shop.
  const [shop, setShop] = useState<ShopInfo | null | undefined>(undefined);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  // "My number has changed": the phone above is then the old one.
  const [numberChanged, setNumberChanged] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let stale = false;
    getShopInfo(slug)
      .then((info) => { if (!stale) setShop(info); })
      .catch(() => { if (!stale) setShop(null); });
    return () => { stale = true; };
  }, [slug]);

  usePageMeta(
    shop
      ? {
          title: `${shop.name} | ${SITE_NAME}`,
          description: c.pageIntro.replace('{shop}', shop.name),
          // A form for the shop's own customers, not a page to find in a search.
          index: false,
          path: publicProfilePath(slug),
        }
      : null,
  );

  if (shop === undefined) {
    return <div className="spinner-page"><div className="spinner spinner--lg" /></div>;
  }
  if (shop === null) return <NotFoundPage />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await submitCustomerProfile(slug, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        ...(numberChanged && newPhone.trim() && { newPhone: newPhone.trim() }),
        ...(photo && { photo }),
      });
      if (photo) rememberPhotoAdded(slug);
      setDone(true);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, c.errorSubmit));
    } finally {
      setSubmitting(false);
    }
  };

  const open = shop.customerProfilePageEnabled && shop.acceptingBookings;

  return (
    <div className="public-page">
      <PublicPalette palette={parsePublicPalette(shop.publicPalette)} font={parsePublicFont(shop.publicFont)} />
      <div className="booking-card">
        <header className="booking-card__head">
          {shop.photoUrl && (
            <div className="cover"><img src={mediaUrl(shop.photoUrl)} alt="" /></div>
          )}
          <h1 className="booking-card__title">{shop.name}</h1>
        </header>

        <main className="booking-card__body">
          {!open ? (
            <Alert variant="info" title={c.unavailableTitle}>{c.unavailableBody}</Alert>
          ) : done ? (
            <div className="card card--center">
              <SuccessCheck />
              <h2 className="card__title">{c.successTitle}</h2>
              <p className="card__text">{c.successBody.replace('{shop}', shop.name)}</p>
              <Link className="btn btn--secondary" to={publicShopPath(slug)}>{c.bookLink}</Link>
            </div>
          ) : (
            <form className="public-booking-form" onSubmit={handleSubmit}>
              <div>
                <h2 className="booking-card__heading">{c.pageTitle}</h2>
                <p className="booking-card__hint">{c.pageIntro.replace('{shop}', shop.name)}</p>
              </div>

              <div className="field">
                <label className="field__label" htmlFor={`${uid}-name`}>
                  {t.public.nameLabel} <span className="field__required">*</span>
                </label>
                <input
                  id={`${uid}-name`}
                  className="input"
                  type="text"
                  placeholder={t.public.namePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  maxLength={100}
                  disabled={submitting}
                />
              </div>

              <div className="field">
                <label className="field__label" htmlFor={`${uid}-phone`}>
                  {t.public.phoneLabel} <span className="field__required">*</span>
                </label>
                <input
                  id={`${uid}-phone`}
                  className="input"
                  type="tel"
                  placeholder={t.public.phonePlaceholder}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  disabled={submitting}
                />
              </div>

              {numberChanged ? (
                <div className="field">
                  <label className="field__label" htmlFor={`${uid}-new-phone`}>{c.newPhoneLabel}</label>
                  <input
                    id={`${uid}-new-phone`}
                    className="input"
                    type="tel"
                    placeholder={t.public.phonePlaceholder}
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    autoComplete="tel"
                    aria-describedby={`${uid}-new-phone-hint`}
                    disabled={submitting}
                  />
                  <p id={`${uid}-new-phone-hint`} className="field__hint">{c.newPhoneHint}</p>
                </div>
              ) : (
                <div className="cluster">
                  <button type="button" className="btn btn--ghost btn--sm btn--wrap" onClick={() => setNumberChanged(true)} disabled={submitting}>
                    {c.numberChanged}
                  </button>
                </div>
              )}

              <div className="field">
                <label className="field__label" htmlFor={`${uid}-email`}>
                  {t.public.emailLabel} <span className="field__optional">{t.public.emailOptional}</span>
                </label>
                <input
                  id={`${uid}-email`}
                  className="input"
                  type="email"
                  placeholder={t.public.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={submitting}
                />
              </div>

              {shop.customerPhotosEnabled && (
                <div className="field">
                  <span className="field__label">
                    {c.photoLabel} <span className="field__optional">{t.public.emailOptional}</span>
                  </span>
                  <CustomerPhotoPicker value={photo} onChange={setPhoto} disabled={submitting} />
                  <p className="field__hint">{c.photoHelp}</p>
                </div>
              )}

              <p className="field__hint">{c.existingNote}</p>
              <p className="field__hint">
                {t.public.privacyNoticeBefore}{' '}
                <Link to="/privacy" target="_blank" rel="noopener">{t.public.privacyNoticeLink}</Link>
                {t.public.privacyNoticeAfter}
              </p>

              {error && <Alert variant="danger">{error}</Alert>}

              <button
                type="submit"
                className={`btn btn--block${submitting ? ' is-loading' : ''}`}
                aria-busy={submitting}
                disabled={name.trim() === '' || !isPlausiblePhone(phone) || (numberChanged && newPhone.trim() !== '' && !isPlausiblePhone(newPhone))}
              >
                {c.submit}
              </button>
            </form>
          )}
          <div className="booking-card__lang"><LangSwitch /></div>
        </main>
      </div>
    </div>
  );
}
