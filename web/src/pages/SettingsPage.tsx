import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LanguageContext';
import { updateMe, deleteMe } from '../api/user.api';
import { getSessions, revokeAllSessions, type Session } from '../api/auth.api';
import '../styles/pages/settings.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope,
  faLock,
  faSlidersH,
  faShieldHalved,
  faTriangleExclamation,
  faUser,
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

  // Update email
  const [email, setEmail] = useState(user?.email ?? '');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  const [name, setName] = useState(user?.name ?? '');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');

  // Update password
  const [password, setPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

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

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError('');
    setNameSuccess('');
    if (!name || name === user?.name) return;
    setNameLoading(true);
    try {
      const data = await updateMe({ name });
    if (data.message) {
      setNameSuccess(data.message);
      setUser({ ...user!, name: data.user.name });  // ← update context
      setName(data.user.name ?? ''); 
      } else {
        setUser({ ...user!, name: data.user.name });
        setNameSuccess(t.settings.successName);
      }
    } catch (err: any) {
      setNameError(err.response?.data?.message ?? t.settings.errorName);
    } finally {
      setNameLoading(false);
    }
  };

    const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');
    if (!email || email === user?.email) return;
    setEmailLoading(true);
    try {
      const data = await updateMe({ email });
      if (data.message) {
        setEmailSuccess(data.message);
        setEmail(user?.email ?? '');
      } else {
        setUser({ ...user!, email: data.user.email });
        setEmailSuccess(t.settings.successEmail);
      }
    } catch (err: any) {
      setEmailError(err.response?.data?.message ?? t.settings.errorEmail);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordLoading(true);
    try {
      await updateMe({ password });
      setPassword('');
      setPasswordSuccess(t.settings.successPassword);
    } catch (err: any) {
      setPasswordError(err.response?.data?.message ?? t.settings.errorPassword);
    } finally {
      setPasswordLoading(false);
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
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

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
            <span className={`settings-plan-badge settings-plan-badge--${user?.plan ?? 'free'}`}>
              {user?.plan === 'pro' ? t.settings.pro : t.settings.free}
            </span>
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
      {/* User Name */}
      <div className="settings-section">
        <p className="settings-section-title">
          <FontAwesomeIcon icon={faUser} className="settings-section-icon" />
          {t.settings.nameSection}
        </p>
        <form onSubmit={handleUpdateName}>
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
          {nameError && <div className="alert alert-error">{nameError}</div>}
          {nameSuccess && <div className="alert alert-success">{nameSuccess}</div>}
          <button
            className="btn btn-primary"
            type="submit"
            disabled={nameLoading || name === user?.name}
          >
            {nameLoading ? t.settings.saving : t.settings.saveName}
          </button>
        </form>
      </div>
      {/* Email Address */}
      <div className="settings-section">
        <p className="settings-section-title">
          <FontAwesomeIcon icon={faEnvelope} className="settings-section-icon" />
          {t.settings.emailSection}
        </p>
        <form onSubmit={handleUpdateEmail}>
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
          {emailError && <div className="alert alert-error">{emailError}</div>}
          {emailSuccess && <div className="alert alert-success">{emailSuccess}</div>}
          <button
            className="btn btn-primary"
            type="submit"
            disabled={emailLoading || email === user?.email}
          >
            {emailLoading ? t.settings.saving : t.settings.saveEmail}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="settings-section">
        <p className="settings-section-title">
          <FontAwesomeIcon icon={faLock} className="settings-section-icon" />
          {t.settings.passwordSection}
        </p>
        <form onSubmit={handleUpdatePassword}>
          <div className="form-group">
            <label htmlFor="settings-password">{t.settings.newPasswordLabel}</label>
            <input
              id="settings-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {password.length > 0 && (
              <ul className="password-requirements">
                <li className={password.length >= 8 ? 'req-met' : 'req-unmet'}>{t.settings.pwMin}</li>
                <li className={/[A-Z]/.test(password) ? 'req-met' : 'req-unmet'}>{t.settings.pwUpper}</li>
                <li className={/[0-9]/.test(password) ? 'req-met' : 'req-unmet'}>{t.settings.pwNumber}</li>
                <li className={/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) ? 'req-met' : 'req-unmet'}>
                  {t.settings.pwSpecial}
                </li>
              </ul>
            )}
          </div>
          {passwordError && <div className="alert alert-error">{passwordError}</div>}
          {passwordSuccess && <div className="alert alert-success">{passwordSuccess}</div>}
          <button
            className="btn btn-primary"
            type="submit"
            disabled={passwordLoading || !passwordValid}
          >
            {passwordLoading ? t.settings.saving : t.settings.updatePassword}
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
            {theme === 'dark' ? `☀️ ${t.settings.lightTheme}` : `🌙 ${t.settings.darkTheme}`}
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
            {language === 'el' ? '🇬🇧 English' : '🇬🇷 Ελληνικά'}
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
