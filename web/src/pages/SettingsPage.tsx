import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
} from '@fortawesome/free-solid-svg-icons';
import { apiErrorMessage } from '../utils/apiError';
import Alert from '../components/Alert';
import ConfirmDialog from '../components/ConfirmDialog';

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

export default function SettingsPage() {
  const { user, setUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setDeleteLoading(true);
    try {
      await deleteMe(user?.hasPassword ? deletePassword : undefined);
      await logout();
      navigate('/');
    } catch (err: unknown) {
      setDeleteError(apiErrorMessage(err, 'Failed to delete account.'));
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
      <h1>{t.settings.title}</h1>

      {/* Account Overview */}
      <div className="card settings-section settings-overview">
        <div className="settings-avatar">
          {getInitials(user?.email ?? '?')}
        </div>
        <div className="settings-overview-info">
          <p className="settings-overview-email">{user?.email}</p>
          <div className="settings-overview-badges">
            {user?.isVerified ? (
              <span className="badge badge--success">{t.settings.verified}</span>
            ) : (
              <span className="badge badge--warning">{t.settings.notVerified}</span>
            )}
          </div>
          {user?.createdAt && (
            <p className="settings-overview-since">{t.settings.memberSince} {formatMemberSince(user.createdAt, language)}</p>
          )}
        </div>
      </div>
      {/* Profile — name, email, password, one save */}
      <div className="card settings-section">
        <p className="card__title settings-section-title">
          <FontAwesomeIcon icon={faUser} className="settings-section-icon" />
          {t.settings.profileSection}
        </p>
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
            <input className="input"
              id="settings-password"
              type="password"
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
            className="btn btn--sm"
            type="submit"
            disabled={profileLoading || !isProfileDirty || !passwordValid}
          >
            {profileLoading ? t.settings.saving : t.settings.saveProfile}
          </button>
        </form>
      </div>

      {/* Preferences */}
      <div className="card settings-section">
        <p className="card__title settings-section-title">
          <FontAwesomeIcon icon={faSlidersH} className="settings-section-icon" />
          {t.settings.preferencesSection}
        </p>
        <div className="settings-pref-row">
          <div className="settings-pref-label">
            <span>{t.settings.themeLabel}</span>
            <span className="settings-pref-desc">{t.settings.themeDesc}</span>
          </div>
          <button
            className="btn btn--secondary btn--sm settings-pref-btn"
            onClick={toggleTheme}
            type="button"
            aria-label={theme === 'dark' ? t.toggles.switchToLight : t.toggles.switchToDark}
          >
            <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
            {' '}{theme === 'dark' ? t.settings.lightTheme : t.settings.darkTheme}
          </button>
        </div>
        <div className="settings-pref-row">
          <div className="settings-pref-label">
            <span>{t.settings.languageLabel}</span>
            <span className="settings-pref-desc">{t.settings.languageDesc}</span>
          </div>
          <button
            className="btn btn--secondary btn--sm settings-pref-btn"
            onClick={toggleLanguage}
            type="button"
            aria-label={language === 'el' ? 'Switch to English' : 'Αλλαγή σε Ελληνικά'}
          >
            {language === 'el' ? 'English' : 'Ελληνικά'}
          </button>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="card settings-section">
        <p className="card__title settings-section-title">
          <FontAwesomeIcon icon={faShieldHalved} className="settings-section-icon" />
          {t.settings.activeSessionsSection}
        </p>
        {sessionsLoading ? (
          <p className="settings-sessions-hint">{t.settings.loadingSessions}</p>
        ) : sessions.length === 0 ? (
          <p className="settings-sessions-hint">{t.settings.noSessions}</p>
        ) : (
          <>
            <p className="settings-sessions-hint">
              {sessions.length} {t.settings.sessions} — {t.settings.mostRecent} {formatSessionDate(sessions[0].createdAt, language)}
            </p>
            <div className="settings-sessions-list">
              {sessions.slice(0, 5).map((s) => (
                <div key={s.id} className="settings-session-row">
                  <FontAwesomeIcon icon={faUser} className="settings-session-icon" />
                  <span className="settings-session-date">{t.settings.sessionStarted} {formatSessionDate(s.createdAt, language)}</span>
                  <span className="settings-session-expiry">{t.settings.sessionExpires} {formatSessionDate(s.expiresAt, language)}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {revokeError && <Alert variant="danger">{revokeError}</Alert>}
        {revokeSuccess && <Alert variant="success">{revokeSuccess}</Alert>}
        <button
          className="btn btn--secondary btn--sm"
          type="button"
          onClick={handleRevokeAll}
          disabled={revokeLoading || sessions.length === 0}
        >
          {revokeLoading ? t.settings.revoking : t.settings.revokeAll}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="card card--danger settings-section">
        <p className="card__title settings-section-title">
          <FontAwesomeIcon icon={faTriangleExclamation} className="settings-section-icon" />
          {t.settings.dangerZone}
        </p>
        <p className="settings-danger-desc">
          {t.settings.dangerDesc}
        </p>

        <button
          className="btn btn--danger btn--sm"
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
          message={t.settings.areYouSure}
          confirmLabel={t.settings.deleteAccountConfirmButton}
          cancelLabel={t.settings.cancel}
          busy={deleteLoading}
          confirmDisabled={!!user?.hasPassword && !deletePassword}
          onConfirm={handleDeleteAccount}
          onCancel={closeDeleteConfirm}
        >
          {user?.hasPassword && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (deletePassword && !deleteLoading) handleDeleteAccount();
              }}
            >
              <div className="field">
                <label className="field__label" htmlFor="delete-password">{t.settings.confirmPasswordLabel}</label>
                <input className="input"
                  id="delete-password"
                  type="password"
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
