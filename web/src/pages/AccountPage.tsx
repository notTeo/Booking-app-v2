import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePalette } from '../context/PaletteContext';
import { PALETTES } from '../utils/palette';
import { useLang } from '../context/LanguageContext';
import { updateMe, deleteMe } from '../api/user.api';
import { getSessions, revokeAllSessions, type Session } from '../api/auth.api';
import PasswordRequirement from '../components/PasswordRequirement';
import '../styles/pages/settings.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSlidersH,
  faShieldHalved,
  faTriangleExclamation,
  faUser,
  faSun,
  faMoon,
  faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';
import { apiErrorField, apiErrorMessage } from '../utils/apiError';
import Alert from '../components/Alert';
import ConfirmDialog from '../components/ConfirmDialog';
import PasswordInput from '../components/PasswordInput';

function getInitials(email: string) {
  return email.charAt(0).toUpperCase();
}

function formatMemberSince(iso: string, lang: string) {
  const locale = lang === 'el' ? 'el-GR' : 'en-US';
  return new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: 'long' });
}

function formatSessionDate(iso: string, lang: string) {
  const locale = lang === 'el' ? 'el-GR' : 'en-US';
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return locale === 'el-GR' ? 'Σήμερα' : 'Today';
  if (diffDays === 1) return locale === 'el-GR' ? 'Χθες' : 'Yesterday';
  if (diffDays < 7) return locale === 'el-GR' ? `${diffDays} μέρες πριν` : `${diffDays} days ago`;
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AccountPage() {
  const { user, setUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { palette, setPalette } = usePalette();
  const { language, toggleLanguage, t } = useLang();
  const navigate = useNavigate();

  // Profile — name, email, password, saved together
  const [email, setEmail] = useState(user?.email ?? '');
  const [name, setName] = useState(user?.name ?? '');
  const [password, setPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Sessions
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [revokeError, setRevokeError] = useState('');
  const [revokeSuccess, setRevokeSuccess] = useState('');

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch(() => {})
      .finally(() => setSessionsLoading(false));
  }, []);

  const isProfileDirty =
    (!!name && name !== user?.name) || (!!email && email !== user?.email) || password.length > 0;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileLoading) return;
    setProfileError('');
    setProfileSuccess('');
    const payload: { name?: string; email?: string; password?: string } = {};
    if (name && name !== user?.name) payload.name = name;
    if (email && email !== user?.email) payload.email = email;
    if (password) payload.password = password;
    if (Object.keys(payload).length === 0) return;

    setProfileLoading(true);
    try {
      const data = await updateMe(payload);
      // `data.user` is only present when name and/or password changed —
      // an email-only change returns just the verification message.
      if (data.user) {
        setUser({ ...user!, name: data.user.name, email: data.user.email });
      }
      if (data.message) {
        // Email changes go through verification — keep showing the still-current address.
        setEmail(data.user?.email ?? user?.email ?? '');
        setProfileSuccess(data.message);
      } else {
        setProfileSuccess(t.settings.successProfile);
      }
      setPassword('');
    } catch (err: unknown) {
      setProfileError(apiErrorMessage(err, t.settings.errorProfile));
    } finally {
      setProfileLoading(false);
    }
  };

  const handleRevokeAll = async () => {
    if (revokeLoading) return;
    setRevokeError('');
    setRevokeSuccess('');
    setRevokeLoading(true);
    try {
      await revokeAllSessions();
      setSessions([]);
      setRevokeSuccess(t.settings.successRevoke);
    } catch (err: unknown) {
      setRevokeError(apiErrorMessage(err, t.settings.errorRevoke));
    } finally {
      setRevokeLoading(false);
    }
  };

  // Only an explicit `false` means an account without a password; a missing
  // flag must not skip the check.
  const needsPassword = user?.hasPassword !== false;

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setDeleteLoading(true);
    try {
      await deleteMe(needsPassword ? deletePassword : undefined);
      await logout();
      navigate('/');
    } catch (err: unknown) {
      const code = apiErrorField(err, 'code');
      setDeleteError(
        code === 'INVALID_PASSWORD'
          ? t.settings.wrongPassword
          : code === 'SOLE_OWNER_OF_SHOP'
            ? t.settings.soleOwnerOfShop
            : apiErrorMessage(err, 'Failed to delete account.'),
      );
      setDeletePassword('');
      setDeleteLoading(false);
    }
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setDeletePassword('');
    setDeleteError('');
  };

  const passwordValid =
    password.length === 0 ||
    (password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password));

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1 className="t-title">{t.settings.title}</h1>
      </div>

      {/* Account Overview */}
      <div className="card">
        <div className="account-overview">
          <div className="avatar avatar--lg">
            {getInitials(user?.email ?? '?')}
          </div>
          <div className="account-overview__info">
            <p className="t-body account-overview__email"><strong>{user?.email}</strong></p>
            {user?.isVerified ? (
              <span className="badge badge--success">{t.settings.verified}</span>
            ) : (
              <span className="badge badge--warning">{t.settings.notVerified}</span>
            )}
            {user?.createdAt && (
              <p className="t-body-sm t-muted">{t.settings.memberSince} {formatMemberSince(user.createdAt, language)}</p>
            )}
          </div>
        </div>
      </div>
      {/* Profile — name, email, password, one save */}
      <div className="card">
        <h2 className="card__title">
          <FontAwesomeIcon icon={faUser} className="card__icon" />
          {t.settings.profileSection}
        </h2>
        <form onSubmit={handleSaveProfile}>
          <div className="field">
            <label className="field__label" htmlFor="settings-name">{t.settings.nameLabel}</label>
            <input className="input"
              id="settings-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="settings-email">{t.settings.emailLabel}</label>
            <input className="input"
              id="settings-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="settings-password">{t.settings.newPasswordOptionalLabel}</label>
            <PasswordInput
              id="settings-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {password.length > 0 && (
              <ul className="password-requirements">
                <PasswordRequirement met={password.length >= 8} label={t.settings.pwMin} />
                <PasswordRequirement met={/[A-Z]/.test(password)} label={t.settings.pwUpper} />
                <PasswordRequirement met={/[0-9]/.test(password)} label={t.settings.pwNumber} />
                <PasswordRequirement met={/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)} label={t.settings.pwSpecial} />
              </ul>
            )}
          </div>
          {profileError && <Alert variant="danger">{profileError}</Alert>}
          {profileSuccess && <Alert variant="success">{profileSuccess}</Alert>}
          <button
            className={`btn btn--sm${profileLoading ? ' is-loading' : ''}`}
            type="submit"
            aria-busy={profileLoading}
            disabled={!isProfileDirty || !passwordValid}
          >
            {t.settings.saveProfile}
          </button>
        </form>
      </div>

      {/* Preferences */}
      <div className="card">
        <h2 className="card__title">
          <FontAwesomeIcon icon={faSlidersH} className="card__icon" />
          {t.settings.preferencesSection}
        </h2>
        <div className="setting-row">
          <div className="setting-row__label">
            <span className="setting-row__title" id="palette-label">{t.settings.paletteLabel}</span>
            <span className="setting-row__text">{t.settings.paletteDesc}</span>
          </div>
          <div className="cluster cluster--tight cluster--nowrap" role="group" aria-labelledby="palette-label">
            {PALETTES.map((p) => (
              <button
                key={p}
                type="button"
                className={`swatch-box swatch--${p}`}
                aria-pressed={palette === p}
                aria-label={t.settings.palettes[p]}
                title={t.settings.palettes[p]}
                onClick={() => setPalette(p)}
              />
            ))}
          </div>
        </div>
        <div className="setting-row">
          <div className="setting-row__label">
            <span className="setting-row__title">{t.settings.themeLabel}</span>
            <span className="setting-row__text">{t.settings.themeDesc}</span>
          </div>
          <button
            className="btn btn--secondary btn--sm"
            onClick={toggleTheme}
            type="button"
            aria-label={theme === 'dark' ? t.toggles.switchToLight : t.toggles.switchToDark}
          >
            <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
            {' '}{theme === 'dark' ? t.settings.lightTheme : t.settings.darkTheme}
          </button>
        </div>
        <div className="setting-row">
          <div className="setting-row__label">
            <span className="setting-row__title">{t.settings.languageLabel}</span>
            <span className="setting-row__text">{t.settings.languageDesc}</span>
          </div>
          <button
            className="btn btn--secondary btn--sm"
            onClick={toggleLanguage}
            type="button"
            aria-label={language === 'el' ? 'Switch to English' : 'Αλλαγή σε Ελληνικά'}
          >
            {language === 'el' ? 'English' : 'Ελληνικά'}
          </button>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="card">
        <h2 className="card__title">
          <FontAwesomeIcon icon={faShieldHalved} className="card__icon" />
          {t.settings.activeSessionsSection}
        </h2>
        {sessionsLoading ? (
          <p className="card__text">{t.settings.loadingSessions}</p>
        ) : sessions.length === 0 ? (
          <p className="card__text">{t.settings.noSessions}</p>
        ) : (
          <>
            <p className="card__text">
              {sessions.length} {t.settings.sessions} — {t.settings.mostRecent} {formatSessionDate(sessions[0].createdAt, language)}
            </p>
            <ul className="list">
              {sessions.slice(0, 5).map((s) => (
                <li key={s.id} className="list__item">
                  <span>
                    <FontAwesomeIcon icon={faUser} className="card__icon" aria-hidden="true" />
                    {t.settings.sessionStarted} {formatSessionDate(s.createdAt, language)}
                  </span>
                  <span className="t-muted">{t.settings.sessionExpires} {formatSessionDate(s.expiresAt, language)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {revokeError && <Alert variant="danger">{revokeError}</Alert>}
        {revokeSuccess && <Alert variant="success">{revokeSuccess}</Alert>}
        <button
          className={`btn btn--secondary btn--sm${revokeLoading ? ' is-loading' : ''}`}
          type="button"
          onClick={handleRevokeAll}
          aria-busy={revokeLoading}
          disabled={sessions.length === 0}
        >
          {t.settings.revokeAll}
        </button>
      </div>

      {/* Log out */}
      <div className="card">
        <div className="setting-row">
          <div className="setting-row__label">
            <span className="setting-row__title">{t.settings.logout}</span>
            <span className="setting-row__text">{t.settings.logoutDesc}</span>
          </div>
          <button
            className="btn btn--danger btn--sm"
            type="button"
            onClick={async () => { await logout(); navigate('/login'); }}
          >
            <FontAwesomeIcon icon={faRightFromBracket} aria-hidden="true" />
            {' '}{t.settings.logout}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card card--danger">
        <h2 className="card__title">
          <FontAwesomeIcon icon={faTriangleExclamation} className="card__icon" />
          {t.settings.dangerZone}
        </h2>
        <p className="card__text">{t.settings.dangerDesc}</p>

        <button
          className="btn btn--danger-outline btn--sm"
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
        >
          {t.settings.deleteAccount}
        </button>
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          tone="danger"
          title={t.settings.deleteAccountTitle}
          message={t.settings.deleteAccountMessage}
          confirmLabel={t.settings.deleteAccountConfirmButton}
          cancelLabel={t.settings.cancel}
          busy={deleteLoading}
          confirmDisabled={needsPassword && !deletePassword}
          onConfirm={handleDeleteAccount}
          onCancel={closeDeleteConfirm}
        >
          {needsPassword && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (deletePassword && !deleteLoading) handleDeleteAccount();
              }}
            >
              <div className="field">
                <label className="field__label" htmlFor="delete-password">{t.settings.confirmPasswordLabel}</label>
                <PasswordInput
                  id="delete-password"
                  autoComplete="current-password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder={t.settings.confirmPasswordPlaceholder}
                  required
                />
              </div>
            </form>
          )}
          {deleteError && <Alert variant="danger">{deleteError}</Alert>}
        </ConfirmDialog>
      )}
    </div>
  );
}
