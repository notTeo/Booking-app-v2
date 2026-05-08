import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/plans.css';

export default function PricingPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const handleUpgradeClick = () => {
    if (!isAuthenticated) {
      navigate('/register');
    }
    // TODO: Payment provider integration — trigger checkout here
  };

  return (
    <div className="dashboard-layout">
      <Navbar />
      <div className="plans-page">
        <h1 className="plans-title">Simple, Honest Pricing</h1>

        <div className="plans-grid">
          {/* Free Plan */}
          <div className="card plan-card">
            <h2 className="plan-name">Free</h2>
            <p className="plan-price">€0 / month</p>
            <ul className="plan-features">
              <li>Create an account</li>
              <li>Browse the platform</li>
              <li>Accept bookings as staff</li>
            </ul>
            <button className="btn btn-ghost" disabled>
              {user?.plan === 'free' || !isAuthenticated ? 'Current Plan' : ''}
            </button>
          </div>

          {/* Pro Plan */}
          <div className="card plan-card plan-card--pro">
            <h2 className="plan-name">Pro</h2>
            <p className="plan-price">€19 / month</p>
            <ul className="plan-features">
              <li>Everything in Free</li>
              <li>Create and manage your shop</li>
              <li>Public booking page</li>
              <li>Up to 10 staff members</li>
              <li>Unlimited bookings</li>
              <li>Email booking confirmations</li>
              <li>Full service management</li>
              <li>Client profiles & history</li>
            </ul>
            {user?.plan === 'pro' ? (
              <button className="btn btn-ghost" disabled>Current Plan</button>
            ) : (
              <button className="btn btn-primary" onClick={handleUpgradeClick}>
                {/* TODO: Payment provider integration — replace label when checkout is live */}
                Get Pro
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
