import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faCrown,
  faStar,
  faCircleCheck,
  faCircleXmark,
  faClock,
  faEnvelope,
  faFingerprint,
  faShieldHalved,
  faCreditCard,
  faGear,
  faStore,
  faArrowRight,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/dashboard.css';

export default function DashboardPage() {
  const { user } = useAuth();

  const sub         = user?.subscription;
  const name        = user?.name;
  const isPro       = user?.plan === 'pro';
  const isCanceling = isPro && sub?.cancelAtPeriodEnd === true;
  const isRenewing  = isPro && !sub?.cancelAtPeriodEnd;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  

  return (
    <div className="dashboard-content">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="dash-header">
        <h1 className="dash-title">Overview</h1>
        <p className="dash-subtitle">Welcome back, {name}</p>
      </div>

      {/* ── Stats row ───────────────────────────────────────────────────────── */}
      <div className="dash-stats">

        {/* Plan */}
        <div className="dash-stat-card">
          <div className="dash-stat-icon">
            <FontAwesomeIcon icon={isPro ? faCrown : faStar} />
          </div>
          <div className="dash-stat-body">
            <p className="dash-stat-label">Current Plan</p>
            <p className={`dash-stat-value${isPro ? ' dash-stat-value--accent' : ''}`}>
              {isPro ? 'Pro' : 'Free'}
            </p>
            {!isPro && (
              <Link to="/billing" className="dash-stat-action">
                Upgrade to Pro <FontAwesomeIcon icon={faArrowRight} />
              </Link>
            )}
          </div>
        </div>

        {/* Account status */}
        <div className="dash-stat-card">
          <div className={`dash-stat-icon${user?.isVerified ? '' : ' dash-stat-icon--warning'}`}>
            <FontAwesomeIcon icon={user?.isVerified ? faCircleCheck : faTriangleExclamation} />
          </div>
          <div className="dash-stat-body">
            <p className="dash-stat-label">Account Status</p>
            <p
              className="dash-stat-value"
              style={{ color: user?.isVerified ? 'var(--success)' : '#fbbf24' }}
            >
              {user?.isVerified ? 'Verified' : 'Unverified'}
            </p>
          </div>
        </div>

        {/* Member since */}
        <div className="dash-stat-card">
          <div className="dash-stat-icon">
            <FontAwesomeIcon icon={faClock} />
          </div>
          <div className="dash-stat-body">
            <p className="dash-stat-label">Member Since</p>
            <p className="dash-stat-value dash-stat-value--sm">
              {user?.createdAt ? formatDate(user.createdAt) : '—'}
            </p>
          </div>
        </div>

      </div>

      {/* ── Account details card ─────────────────────────────────────────────── */}
      <div className="dash-card">
        <p className="dash-card-title">Account Details</p>

        <div className="dash-fields">

          {/* Name */}
          <div className="dash-field">
            <div className="dash-field-icon">
              <FontAwesomeIcon icon={faUser} />
            </div>
            <div className="dash-field-body">
              <p className="dash-field-label">User Name</p>
              <p className="dash-field-value">{name}</p>
            </div>
          </div>
          {/* Email */}
          <div className="dash-field">
            <div className="dash-field-icon">
              <FontAwesomeIcon icon={faEnvelope} />
            </div>
            <div className="dash-field-body">
              <p className="dash-field-label">Email Address</p>
              <p className="dash-field-value">{user?.email}</p>
            </div>
          </div>
          {/* User ID */}
          <div className="dash-field">
            <div className="dash-field-icon">
              <FontAwesomeIcon icon={faFingerprint} />
            </div>
            <div className="dash-field-body">
              <p className="dash-field-label">User ID</p>
              <p className="dash-field-value--muted">{user?.id}</p>
            </div>
          </div>

          {/* Verification */}
          <div className="dash-field">
            <div className="dash-field-icon">
              <FontAwesomeIcon icon={faShieldHalved} />
            </div>
            <div className="dash-field-body">
              <p className="dash-field-label">Email Verified</p>
              <p className={`dash-field-value dash-field-value--${user?.isVerified ? 'success' : 'error'}`}>
                <FontAwesomeIcon
                  icon={user?.isVerified ? faCircleCheck : faCircleXmark}
                  style={{ marginRight: '0.4rem', fontSize: '0.85rem' }}
                />
                {user?.isVerified ? 'Verified' : 'Not verified'}
              </p>
            </div>
          </div>

          {/* Plan */}
          <div className="dash-field">
            <div className="dash-field-icon">
              <FontAwesomeIcon icon={isPro ? faCrown : faStar} />
            </div>
            <div className="dash-field-body">
              <p className="dash-field-label">Plan</p>
              <div className="dash-field-row">
                <span className={`dash-plan-badge dash-plan-badge--${user?.plan ?? 'free'}`}>
                  <FontAwesomeIcon icon={isPro ? faCrown : faStar} />
                  {isPro ? 'Pro' : 'Free'}
                </span>
                {!isPro && (
                  <Link to="/billing" className="dash-upgrade-link">
                    Upgrade →
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Renews on — Pro renewing */}
          {isRenewing && sub?.currentPeriodEnd && (
            <div className="dash-field">
              <div className="dash-field-icon">
                <FontAwesomeIcon icon={faClock} />
              </div>
              <div className="dash-field-body">
                <p className="dash-field-label">Renews On</p>
                <p className="dash-field-value">{formatDate(sub.currentPeriodEnd)}</p>
              </div>
            </div>
          )}

          {/* Cancellation notice — Pro canceling */}
          {isCanceling && sub?.currentPeriodEnd && (
            <div className="dash-field">
              <div className="dash-field-icon" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
                <FontAwesomeIcon icon={faTriangleExclamation} />
              </div>
              <div className="dash-field-body">
                <p className="dash-field-label">Subscription</p>
                <div className="dash-sub-notice">
                  <FontAwesomeIcon icon={faTriangleExclamation} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>
                    Your subscription is canceled and will not renew. Access continues until{' '}
                    <strong>{formatDate(sub.currentPeriodEnd)}</strong>.{' '}
                    <Link to="/billing">Manage →</Link>
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Quick actions ────────────────────────────────────────────────────── */}
      <div className="dash-actions">

        <Link to="/shops" className="dash-action-card">
          <div className="dash-action-icon">
            <FontAwesomeIcon icon={faStore} />
          </div>
          <div className="dash-action-text">
            <p className="dash-action-label">My Shops</p>
            <p className="dash-action-sub">Manage your locations</p>
          </div>
          <FontAwesomeIcon icon={faArrowRight} className="dash-action-arrow" />
        </Link>

        <Link to="/billing" className="dash-action-card">
          <div className="dash-action-icon">
            <FontAwesomeIcon icon={faCreditCard} />
          </div>
          <div className="dash-action-text">
            <p className="dash-action-label">Billing</p>
            <p className="dash-action-sub">Plans &amp; subscriptions</p>
          </div>
          <FontAwesomeIcon icon={faArrowRight} className="dash-action-arrow" />
        </Link>

        <Link to="/settings" className="dash-action-card">
          <div className="dash-action-icon">
            <FontAwesomeIcon icon={faGear} />
          </div>
          <div className="dash-action-text">
            <p className="dash-action-label">Settings</p>
            <p className="dash-action-sub">Account preferences</p>
          </div>
          <FontAwesomeIcon icon={faArrowRight} className="dash-action-arrow" />
        </Link>

      </div>

    </div>
  );
}
