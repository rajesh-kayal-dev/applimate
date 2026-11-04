import React, { useEffect, useState } from 'react';
import applimateLogo from '../../assets/ApplimateLogo.png';

function Icon({ name }) {
  if (name === 'mail') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="1.5" /><path d="m4.5 7 7.5 6 7.5-6" /></svg>;
  }
  if (name === 'lock') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
  }
  if (name === 'eye') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.6" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m7 7-7-7 7-7" /></svg>;
}

export default function AuthModal({ onClose }) {
  const [step, setStep] = useState('email');
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function continueWithEmail(event) {
    event.preventDefault();
    if (email.trim()) setStep('password');
  }

  return (
    <div className="auth-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <button className="auth-modal-close" type="button" onClick={onClose} aria-label="Close dialog">×</button>
        {step === 'password' && (
          <button className="auth-modal-back" type="button" onClick={() => setStep('email')} aria-label="Back to email">
            <Icon name="back" />
          </button>
        )}
        <img className="auth-modal-logo" src={applimateLogo} alt="Applimate" />

        {step === 'email' ? (
          <>
            <h2 id="auth-modal-title">{mode === 'signup' ? 'Create your account' : 'Sign in'}</h2>
            <p className="auth-modal-subtitle">Continue to Applimate</p>
            <button className="auth-google-button" type="button">
              <span className="auth-google-mark" aria-hidden="true">G</span>
              Continue with Google
            </button>
            <div className="auth-divider"><span>or</span></div>
            <form onSubmit={continueWithEmail}>
              <label className="auth-input-wrap">
                <Icon name="mail" />
                <input
                  type="email"
                  aria-label="Email address"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </label>
              <button className="auth-primary-button" type="submit">Continue</button>
            </form>
            <p className="auth-modal-footer">
              {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
              <button type="button" onClick={() => setMode((current) => current === 'signin' ? 'signup' : 'signin')}>
                {mode === 'signup' ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </>
        ) : (
          <>
            <h2 id="auth-modal-title">{mode === 'signup' ? 'Create a password' : 'Enter your password'}</h2>
            <p className="auth-modal-subtitle">to continue to Applimate</p>
            <div className="auth-email-summary"><Icon name="mail" /><span>{email}</span></div>
            <form onSubmit={(event) => event.preventDefault()}>
              <label className="auth-input-wrap">
                <Icon name="lock" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  aria-label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                />
                <button className="auth-password-toggle" type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  <Icon name="eye" />
                </button>
              </label>
              <button className="auth-primary-button" type="submit">{mode === 'signup' ? 'Sign up' : 'Sign in'}</button>
            </form>
            {mode === 'signin' && <button className="auth-forgot-button" type="button">Forgot password?</button>}
          </>
        )}
      </section>
    </div>
  );
}
