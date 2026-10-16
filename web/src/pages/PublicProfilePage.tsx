import { useEffect, useId, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getOwnProfile, getShopInfo, submitCustomerProfile, type OwnProfile, type ShopInfo } from '../api/public.api';
import { useLang } from '../context/LanguageContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { SITE_NAME } from '../config/seo';
import { apiErrorMessage } from '../utils/apiError';
import { parsePublicFont, parsePublicPalette } from '../utils/branding';
import { mediaUrl } from '../utils/media';
import { isPlausiblePhone } from '../utils/phone';
import PhoneInput from '../components/PhoneInput';
import { isPlausibleSlug, publicProfilePath, publicShopPath } from '../utils/publicLink';
import Alert from '../components/Alert';
import Avatar from '../components/Avatar';
import CustomerPhotoPicker, { type PickedPhoto } from '../components/CustomerPhotoPicker';
import LangSwitch from '../components/LangSwitch';
import PublicPalette from '../components/PublicPalette';
import SuccessCheck from '../components/SuccessCheck';
import NotFoundPage from './NotFoundPage';
import '../styles/pages/public.css';

// The shop's customer page (/<slug>/profile), usually opened from the QR code
// the shop prints. In a browser the shop has not seen, a customer leaves their
// name and phone, and a photo if the shop takes them. In the browser they
// signed up or booked from, they see what the shop has and change it.
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
  // The customer this browser is at the shop (the API knows it by a cookie).
  const [me, setMe] = useState<OwnProfile | null>(null);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let stale = false;
    // Nobody known reads the same as a failed look-up: an empty form.
    Promise.all([getShopInfo(slug), getOwnProfile(slug).catch(() => null)])
      .then(([info, own]) => {
        if (stale) return;
        if (own) {
          setMe(own);
          setName(own.name);
          setPhone(own.phone);
          setEmail(own.email ?? '');
        }
        setShop(info);
      })
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
        ...(photo && { photo }),
      });
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
                <p className="booking-card__hint">{(me ? c.pageIntroKnown : c.pageIntro).replace('{shop}', shop.name)}</p>
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
                <PhoneInput
                  id={`${uid}-phone`}
                  placeholder={t.public.phonePlaceholder}
                  value={phone}
                  onChange={setPhone}
                  autoComplete="tel"
                  disabled={submitting}
                />
              </div>

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
                  {me?.photoUrl && !photo && (
                    <div className="cluster cluster--tight">
                      <Avatar name={me.name} photoUrl={me.photoUrl} size="lg" enlarge />
                      <span className="field__hint">{c.currentPhoto}</span>
                    </div>
                  )}
                  <CustomerPhotoPicker value={photo} onChange={setPhoto} disabled={submitting} />
                  <p className="field__hint">{c.photoHelp}</p>
                </div>
              )}

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
                disabled={name.trim() === '' || !isPlausiblePhone(phone)}
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
