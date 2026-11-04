import React, { useState } from 'react';
import { setToken } from '../api.js';

export default function Login({ onLogin, onOpenAuthModal }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!r.ok) { setError('Wrong password.'); return; }
    const { token } = await r.json();
    setToken(token);
    onLogin();
  }

  return (
    <div className="page login-page" style={{ maxWidth: 420 }}>
      {onOpenAuthModal && (
        <button className="nav-profile login-profile-trigger" type="button" aria-label="Sign in or sign up" onClick={onOpenAuthModal}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9.25" />
            <circle cx="12" cy="9" r="3" />
            <path d="M6.7 18.1c.8-2.4 2.7-3.6 5.3-3.6s4.5 1.2 5.3 3.6" />
          </svg>
        </button>
      )}
      <div className="card">
        <h1>Applimate</h1>
        <form onSubmit={submit}>
          <label className="field">
            <span>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </label>
          {error && <div className="error-text">{error}</div>}
          <button className="btn" type="submit">Log in</button>
        </form>
      </div>
    </div>
  );
}
