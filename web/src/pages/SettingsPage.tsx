import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateMe, deleteMe } from '../api/user.api';
import '../styles/pages/settings.css';

export default function SettingsPage() {
  const { user, setUser, logout } = useAuth();
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

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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

      {/* Update Email */}
      <div className="settings-section">
        <p className="settings-section-title">Email Address</p>
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

      {/* Update Password */}
      <div className="settings-section">
        <p className="settings-section-title">Change Password</p>
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

      {/* Danger Zone */}
      <div className="settings-section settings-section--danger">
        <p className="settings-section-title">Danger Zone</p>
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
