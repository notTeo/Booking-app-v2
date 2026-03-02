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

function formatMemberSince(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

function formatSessionDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SettingsPage() {
  const { user, setUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage } = useLang();
  const navigate = useNavigate();

  // Update email
  const [email, setEmail] = useState(user?.email ?? '');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

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
        setEmailSuccess('Email updated successfully.');
      }
    } catch (err: any) {
      setEmailError(err.response?.data?.message ?? 'Failed to update email.');
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
      setPasswordSuccess('Password updated successfully.');
    } catch (err: any) {
      setPasswordError(err.response?.data?.message ?? 'Failed to update password.');
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
      setRevokeSuccess('All other sessions have been revoked.');
    } catch (err: any) {
      setRevokeError(err.response?.data?.message ?? 'Failed to revoke sessions.');
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
      <h1>Settings</h1>

      {/* Account Overview */}
      <div className="settings-section settings-overview">
        <div className="settings-avatar">
          {getInitials(user?.email ?? '?')}
        </div>
        <div className="settings-overview-info">
          <p className="settings-overview-email">{user?.email}</p>
          <div className="settings-overview-badges">
            <span className={`settings-plan-badge settings-plan-badge--${user?.plan ?? 'free'}`}>
              {user?.plan === 'pro' ? '★ Pro' : 'Free'}
            </span>
            {user?.isVerified ? (
              <span className="settings-verified-badge">✓ Verified</span>
            ) : (
              <span className="settings-unverified-badge">✗ Unverified</span>
            )}
          </div>
          {user?.createdAt && (
            <p className="settings-overview-since">Member since {formatMemberSince(user.createdAt)}</p>
          )}
        </div>
      </div>

      {/* Email Address */}
      <div className="settings-section">
        <p className="settings-section-title">
          <FontAwesomeIcon icon={faEnvelope} className="settings-section-icon" />
          Email Address
        </p>
        <form onSubmit={handleUpdateEmail}>
          <div className="form-group">
            <label htmlFor="settings-email">Email</label>
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
            {emailLoading ? 'Saving...' : 'Save Email'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="settings-section">
        <p className="settings-section-title">
          <FontAwesomeIcon icon={faLock} className="settings-section-icon" />
          Change Password
        </p>
        <form onSubmit={handleUpdatePassword}>
          <div className="form-group">
            <label htmlFor="settings-password">New Password</label>
            <input
              id="settings-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {password.length > 0 && (
              <ul className="password-requirements">
                <li className={password.length >= 8 ? 'req-met' : 'req-unmet'}>At least 8 characters</li>
                <li className={/[A-Z]/.test(password) ? 'req-met' : 'req-unmet'}>One uppercase letter</li>
                <li className={/[0-9]/.test(password) ? 'req-met' : 'req-unmet'}>One number</li>
                <li className={/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) ? 'req-met' : 'req-unmet'}>
                  One special character (!@#$%...)
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
            {passwordLoading ? 'Saving...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Preferences */}
      <div className="settings-section">
        <p className="settings-section-title">
          <FontAwesomeIcon icon={faSlidersH} className="settings-section-icon" />
          Preferences
        </p>
        <div className="settings-pref-row">
          <div className="settings-pref-label">
            <span>Theme</span>
            <span className="settings-pref-desc">Choose your preferred color scheme</span>
          </div>
          <button
            className="btn btn-ghost settings-pref-btn"
            onClick={toggleTheme}
            type="button"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
        <div className="settings-pref-row">
          <div className="settings-pref-label">
            <span>Language</span>
            <span className="settings-pref-desc">Set your display language</span>
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
          Active Sessions
        </p>
        {sessionsLoading ? (
          <p className="settings-sessions-hint">Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <p className="settings-sessions-hint">No active sessions found.</p>
        ) : (
          <>
            <p className="settings-sessions-hint">
              {sessions.length} active {sessions.length === 1 ? 'session' : 'sessions'} — most recent: {formatSessionDate(sessions[0].createdAt)}
            </p>
            <div className="settings-sessions-list">
              {sessions.slice(0, 5).map((s) => (
                <div key={s.id} className="settings-session-row">
                  <FontAwesomeIcon icon={faUser} className="settings-session-icon" />
                  <span className="settings-session-date">Session started {formatSessionDate(s.createdAt)}</span>
                  <span className="settings-session-expiry">Expires {formatSessionDate(s.expiresAt)}</span>
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
          {revokeLoading ? 'Revoking...' : 'Revoke All Sessions'}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="settings-section settings-section--danger">
        <p className="settings-section-title">
          <FontAwesomeIcon icon={faTriangleExclamation} className="settings-section-icon" />
          Danger Zone
        </p>
        <p className="settings-danger-desc">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <button
            className="btn btn-danger"
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete Account
          </button>
        ) : user?.hasPassword ? (
          <form className="settings-danger-confirm" onSubmit={handleDeleteAccount}>
            <div className="form-group">
              <label htmlFor="delete-password">Confirm your password</label>
              <input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password to confirm"
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
                {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteError(''); }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <form className="settings-danger-confirm" onSubmit={handleDeleteAccount}>
            <p className="settings-danger-desc">
              Are you sure? This will permanently delete your account and all associated data. This action cannot be undone.
            </p>
            {deleteError && <div className="alert alert-error">{deleteError}</div>}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-danger"
                type="submit"
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Delete My Account'}
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
