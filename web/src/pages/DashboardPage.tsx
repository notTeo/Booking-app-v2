import { useAuth } from '../context/AuthContext';
import '../styles/pages/dashboard.css';
import '../styles/pages/billing.css';

export default function DashboardPage() {
  const { user } = useAuth();

  const sub = user?.subscription;
  const isPro = user?.plan === 'pro';
  const isCanceling = isPro && sub?.cancelAtPeriodEnd === true;
  const isRenewing = isPro && !sub?.cancelAtPeriodEnd;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="dashboard-content">
      <div className="card">
        <h1>Overview</h1>
        <div className="dashboard-field">
          <div>
            <p className="dashboard-field-label">Email</p>
            <p className="dashboard-field-value">{user?.email}</p>
          </div>
          <div>
            <p className="dashboard-field-label">User ID</p>
            <p className="dashboard-field-value--muted">{user?.id}</p>
          </div>
          <div>
            <p className="dashboard-field-label">Email Verified</p>
            <p className="dashboard-field-value" style={{ color: user?.isVerified ? 'var(--success)' : 'var(--error)' }}>
              {user?.isVerified ? 'Verified' : 'Not verified'}
            </p>
          </div>
          <div>
            <p className="dashboard-field-label">Member Since</p>
            <p className="dashboard-field-value">
              {user?.createdAt ? formatDate(user.createdAt) : '—'}
            </p>
          </div>
          <div>
            <p className="dashboard-field-label">Plan</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className={`plan-badge plan-badge--${user?.plan}`}>
                {isPro ? 'Pro' : 'Free'}
              </span>
              {!isPro && (
                <a href="/pricing" style={{ fontSize: '0.85rem', color: 'var(--blue)' }}>
                  Upgrade →
                </a>
              )}
            </div>
          </div>

          {/* Subscription state rows — only shown for Pro users */}
          {isRenewing && sub?.currentPeriodEnd && (
            <div>
              <p className="dashboard-field-label">Renews On</p>
              <p className="dashboard-field-value">{formatDate(sub.currentPeriodEnd)}</p>
            </div>
          )}

          {isCanceling && sub?.currentPeriodEnd && (
            <div>
              <p className="dashboard-field-label">Subscription</p>
              <div className="dashboard-sub-notice">
                ⚠️ Your subscription is canceled and will not renew. Access continues until{' '}
                <strong>{formatDate(sub.currentPeriodEnd)}</strong>.{' '}
                <a href="/billing">Manage →</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
