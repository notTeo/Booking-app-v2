import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { verifyEmailChange } from '../api/auth.api';
import { apiErrorMessage } from '../utils/apiError';
import { useLang } from '../context/LanguageContext';
import Alert from '../components/Alert';
import AuthTop from '../components/AuthTop';

export default function VerifyEmailChangePage() {
  const { t } = useLang();
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
      setMessage(t.verifyEmailChange.invalidLink);
      return;
    }

    verifyEmailChange(token)
      .then(() => {
        setStatus('success');
        setMessage(t.verifyEmailChange.success);
      })
      .catch((err: unknown) => {
        const msg = apiErrorMessage(err, t.verifyEmailChange.error);
        setStatus('error');
        setMessage(msg);
      });
  }, [searchParams]);

  return (
    <div className="page page--center">
      <div className="card card--auth">
        <AuthTop back={false} />
        <h1 className="t-heading">{t.verifyEmailChange.title}</h1>

        {status === 'loading' && <p className="card__text">{t.verifyEmailChange.verifying}</p>}

        {status === 'success' && (
          <>
            <Alert variant="success">{message}</Alert>
            {/* /login sends a live session on to the landing page (PublicRoute). */}
            <Link to="/login"><button className="btn btn--block">{t.verifyEmailChange.continue}</button></Link>
          </>
        )}

        {status === 'error' && (
          <>
            <Alert variant="danger">{message}</Alert>
            <Link to="/account"><button className="btn btn--secondary btn--block">{t.verifyEmailChange.backToAccount}</button></Link>
          </>
        )}
      </div>
    </div>
  );
}
