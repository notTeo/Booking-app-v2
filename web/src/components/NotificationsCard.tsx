import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faMobileScreenButton } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import { getNotifications, updateNotifications, type NotificationSettings } from '../api/user.api';
import { useInstallApp } from '../hooks/useInstallApp';
import { currentSubscription, isPhone, pushState, turnPushOff, turnPushOn, type PushState } from '../utils/push';
import { apiErrorMessage } from '../utils/apiError';
import { InstallGuideModal } from './InstallAppButton';
import Switch from './Switch';
import Alert from './Alert';

/**
 * Account → Notifications: the person's own switches for the booking notices
 * a shop sends them (a customer books, reschedules or cancels). Email
 * anywhere; push on a phone only. Hidden for anyone no shop notifies.
 */
export default function NotificationsCard() {
  const { t } = useLang();
  const install = useInstallApp();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [push, setPush] = useState<{ state: PushState; on: boolean } | null>(null);
  const [busy, setBusy] = useState<'email' | 'push' | null>(null);
  const [error, setError] = useState('');

  const phone = isPhone(navigator.userAgent);

  useEffect(() => {
    let cancelled = false;
    getNotifications()
      .then(async (s) => {
        if (cancelled) return;
        setSettings(s);
        if (!phone || !s.receivesPush || !s.pushPublicKey) return;
        const state = pushState();
        const on = state === 'ready' && !!(await currentSubscription());
        if (!cancelled) setPush({ state, on });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [phone]);

  if (!settings) return null;
  const showEmail = settings.receivesEmail;
  const showPush = push !== null;
  if (!showEmail && !showPush) return null;

  const setEmail = async (on: boolean) => {
    setBusy('email');
    setError('');
    try {
      setSettings(await updateNotifications(on));
    } catch (err) {
      setError(apiErrorMessage(err, t.notifications.saveError));
    } finally {
      setBusy(null);
    }
  };

  const setPushOn = async (on: boolean) => {
    if (!settings.pushPublicKey) return;
    setBusy('push');
    setError('');
    try {
      if (on) {
        const granted = await turnPushOn(settings.pushPublicKey);
        setPush({ state: granted ? 'ready' : pushState(), on: granted });
      } else {
        await turnPushOff();
        setPush({ state: 'ready', on: false });
      }
    } catch (err) {
      setError(apiErrorMessage(err, t.notifications.saveError));
    } finally {
      setBusy(null);
    }
  };

  const pushText =
    push?.state === 'install-first' ? t.notifications.pushInstallFirst
      : push?.state === 'denied' ? t.notifications.pushDenied
        : push?.state === 'unsupported' ? t.notifications.pushUnsupported
          : t.notifications.pushDesc;

  return (
    <div className="card">
      <h2 className="card__title">
        <FontAwesomeIcon icon={faBell} className="card__icon" />
        {t.notifications.section}
      </h2>
      {showEmail && (
        <div className="setting-row">
          <div className="setting-row__label">
            <span className="setting-row__title" id="notify-email-label">{t.notifications.emailLabel}</span>
            <span className="setting-row__text">{t.notifications.emailDesc}</span>
          </div>
          <Switch
            checked={settings.emailNotifications}
            onChange={setEmail}
            disabled={busy === 'email'}
            label={t.notifications.emailLabel}
          />
        </div>
      )}
      {showPush && (
        <div className="setting-row">
          <div className="setting-row__label">
            <span className="setting-row__title">{t.notifications.pushLabel}</span>
            <span className="setting-row__text">{pushText}</span>
          </div>
          {push.state === 'ready' && (
            <Switch checked={push.on} onChange={setPushOn} disabled={busy === 'push'} label={t.notifications.pushLabel} />
          )}
          {push.state === 'install-first' && install.available && (
            <button type="button" className="btn btn--secondary btn--sm" onClick={install.install}>
              <FontAwesomeIcon icon={faMobileScreenButton} aria-hidden="true" />
              {t.install.navLabel}
            </button>
          )}
        </div>
      )}
      {error && <Alert variant="danger">{error}</Alert>}
      {install.guideOpen && <InstallGuideModal guide={install.guide} onClose={install.closeGuide} />}
    </div>
  );
}
