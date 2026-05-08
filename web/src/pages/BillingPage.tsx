import { useAuth } from '../context/AuthContext';
import '../styles/pages/billing.css';

export default function BillingPage() {
  const { user } = useAuth();

  return (
    <div className="billing-page">
      <h1 className="billing-title">Billing</h1>

      <div className="card billing-card">
        <div className="billing-field">
          <span className="billing-label">Current Plan</span>
          <span className={`plan-badge plan-badge--${user?.plan}`}>
            {user?.plan === 'pro' ? 'Pro' : 'Free'}
          </span>
        </div>

        <div className="billing-actions">
          {user?.plan === 'pro' ? (
            // TODO: Payment provider integration — add "Manage Subscription" button here
            <p className="billing-plan-note">Pro plan active. Subscription management coming soon.</p>
          ) : (
            <a href="/pricing" className="btn btn-primary">Upgrade to Pro</a>
          )}
        </div>
      </div>
    </div>
  );
}
