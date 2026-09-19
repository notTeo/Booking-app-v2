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
    } catch (err: any) {
      setProfileError(err.response?.data?.message ?? t.settings.errorProfile);
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
    } catch (err: any) {
      setRevokeError(err.response?.data?.message ?? t.settings.errorRevoke);
    } finally {
      setRevokeLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    setDeleteLoading(true);
    try {
      await deleteMe(user?.hasPassword ? deletePassword : undefined);
      await logout();
      navigate('/');
    } catch (err: any) {
      setDeleteError(err.response?.data?.message ?? 'Failed to delete account.');
      setDeleteLoading(false);
    }
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
      <div className="settings-section settings-overview">
        <div className="settings-avatar">
          {getInitials(user?.email ?? '?')}
        </div>
        <div className="settings-overview-info">
          <p className="settings-overview-email">{user?.email}</p>
          <div className="settings-overview-badges">
            {user?.isVerified ? (
              <span className="settings-verified-badge">{t.settings.verified}</span>
            ) : (
              <span className="settings-unverified-badge">{t.settings.notVerified}</span>
            )}
          </div>
          {user?.createdAt && (
            <p className="settings-overview-since">{t.settings.memberSince} {formatMemberSince(user.createdAt, language)}</p>
          )}
        </div>
      </div>
      {/* Profile — name, email, password, one save */}
      <div className="settings-section">
        <p className="settings-section-title">
          <FontAwesomeIcon icon={faUser} className="settings-section-icon" />
          {t.settings.profileSection}
        </p>
        <form onSubmit={handleSaveProfile}>
          <div className="form-group">
            <label htmlFor="settings-name">{t.settings.nameLabel}</label>
            <input
              id="settings-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="settings-email">{t.settings.emailLabel}</label>
            <input
              id="settings-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="settings-password">{t.settings.newPasswordOptionalLabel}</label>
            <input
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
          {profileError && <div className="alert alert-error">{profileError}</div>}
          {profileSuccess && <div className="alert alert-success">{profileSuccess}</div>}
          <button
            className="btn btn-primary"
            type="submit"
            disabled={profileLoading || !isProfileDirty || !passwordValid}
          >
            {profileLoading ? t.settings.saving : t.settings.saveProfile}
          </button>
        </form>
      </div>

      {/* Preferences */}
      <div className="settings-section">
        <p className="settings-section-title">
          <FontAwesomeIcon icon={faSlidersH} className="settings-section-icon" />
          {t.settings.preferencesSection}
        </p>
        <div className="settings-pref-row">
          <div className="settings-pref-label">
            <span>{t.settings.themeLabel}</span>
            <span className="settings-pref-desc">{t.settings.themeDesc}</span>
          </div>
          <button
            className="btn btn-ghost settings-pref-btn"
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
            className="btn btn-ghost settings-pref-btn"
            onClick={toggleLanguage}
            type="button"
            aria-label={language === 'el' ? 'Switch to English' : 'Αλλαγή σε Ελληνικά'}
          >
            {language === 'el' ? 'English' : 'Ελληνικά'}
          </button>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="settings-section">
        <p className="settings-section-title">
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
        {revokeError && <div className="alert alert-error">{revokeError}</div>}
        {revokeSuccess && <div className="alert alert-success">{revokeSuccess}</div>}
        <button
          className="btn btn-ghost"
          type="button"
          onClick={handleRevokeAll}
          disabled={revokeLoading || sessions.length === 0}
        >
          {revokeLoading ? t.settings.revoking : t.settings.revokeAll}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="settings-section settings-section--danger">
        <p className="settings-section-title">
          <FontAwesomeIcon icon={faTriangleExclamation} className="settings-section-icon" />
          {t.settings.dangerZone}
        </p>
        <p className="settings-danger-desc">
          {t.settings.dangerDesc}
        </p>

        {!showDeleteConfirm ? (
          <button
            className="btn btn-danger"
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
          >
            {t.settings.deleteAccount}
          </button>
        ) : user?.hasPassword ? (
          <form className="settings-danger-confirm" onSubmit={handleDeleteAccount}>
            <div className="form-group">
              <label htmlFor="delete-password">{t.settings.confirmPasswordLabel}</label>
              <input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder={t.settings.confirmPasswordPlaceholder}
                required
              />
            </div>
            {deleteError && <div className="alert alert-error">{deleteError}</div>}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-danger"
                type="submit"
                disabled={deleteLoading || !deletePassword}
              >
                {deleteLoading ? t.settings.deleting : t.settings.confirmDelete}
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteError(''); }}
              >
                {t.settings.cancel}
              </button>
            </div>
          </form>
        ) : (
          <form className="settings-danger-confirm" onSubmit={handleDeleteAccount}>
            <p className="settings-danger-desc">
              {t.settings.areYouSure}
            </p>
            {deleteError && <div className="alert alert-error">{deleteError}</div>}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-danger"
                type="submit"
                disabled={deleteLoading}
              >
                {deleteLoading ? t.settings.deleting : t.settings.yesDelete}
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}
              >
                {t.settings.cancel}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
