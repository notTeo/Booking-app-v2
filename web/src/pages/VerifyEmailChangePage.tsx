import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { verifyEmailChange } from '../api/auth.api';
import '../styles/pages/verify-email.css';
import { apiErrorMessage } from '../utils/apiError';
import Alert from '../components/Alert';

export default function VerifyEmailChangePage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const token = searchParams.get('token');
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time token call on mount; the ref guard must stay in the effect (StrictMode double-run would spend the token twice)
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    verifyEmailChange(token)
      .then(() => {
        setStatus('success');
        setMessage('Your email address has been updated successfully.');
      })
      .catch((err: unknown) => {
        const msg = apiErrorMessage(err, 'Verification failed.');
        setStatus('error');
        setMessage(msg);
      });
  }, [searchParams]);

  return (
    <div className="page page--center">
      <div className="card card--auth">
        <h1 className="t-heading">Email Change Verification</h1>

        {status === 'loading' && <p className="verify-email-status">Verifying...</p>}

        {status === 'success' && (
          <>
            <Alert variant="success">{message}</Alert>
            {/* /login sends a live session on to the landing page (PublicRoute). */}
            <Link to="/login"><button className="btn btn--block">Continue</button></Link>
          </>
        )}

        {status === 'error' && (
          <>
            <Alert variant="danger">{message}</Alert>
            <Link to="/account"><button className="btn btn--secondary btn--block">Back to Account</button></Link>
          </>
        )}
      </div>
    </div>
  );
}
