import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Applications from './pages/Applications.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Profile from './pages/Profile.jsx';
import Login from './pages/Login.jsx';
import { apiFetch, getToken, clearToken } from './api.js';
import applimateLogo from '../assets/ApplimateLogo.png';
import AuthModal from './components/AuthModal.jsx';

export default function App() {
  const [authRequired, setAuthRequired] = useState(null);
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = none
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const navigate = useNavigate();

  async function loadProfile() {
    try {
      const r = await apiFetch('/api/profiles/default');
      if (r.status === 404) { setProfile(null); return; }
      setProfile(await r.json());
    } catch {
      setProfile(null);
    }
  }

  useEffect(() => {
    fetch('/api/auth/required')
      .then((r) => r.json())
      .then((d) => setAuthRequired(d.required))
      .catch(() => setAuthRequired(false));
  }, []);

  useEffect(() => {
    if (authRequired === null) return;
    if (authRequired && !getToken()) return; // Login page handles it
    loadProfile();
  }, [authRequired]);

  if (authRequired === null) return <div className="page">Loading…</div>;
  if (authRequired && !getToken()) {
    return (
      <>
        <Login
          onLogin={() => { setProfile(undefined); window.location.href = '/'; }}
          onOpenAuthModal={() => setAuthModalOpen(true)}
        />
        {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
      </>
    );
  }
  if (profile === undefined) return <div className="page">Loading…</div>;

  const needsOnboarding = !profile || !profile.intake?.complete || !profile.intake_completed_at;

  return (
    <>
      <nav className="nav">
        <NavLink className="brand" to="/" aria-label="Applimate home">
          <img src={applimateLogo} alt="Applimate" />
        </NavLink>
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/applications">Applications</NavLink>
        <NavLink to="/profile">Profile</NavLink>
        <span className="spacer" />
        {profile ? (
          <NavLink to="/profile" className="nav-profile" aria-label="Profile">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9.25" />
              <circle cx="12" cy="9" r="3" />
              <path d="M6.7 18.1c.8-2.4 2.7-3.6 5.3-3.6s4.5 1.2 5.3 3.6" />
            </svg>
          </NavLink>
        ) : (
          <button className="nav-profile" type="button" aria-label="Sign in or sign up" onClick={() => setAuthModalOpen(true)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9.25" />
              <circle cx="12" cy="9" r="3" />
              <path d="M6.7 18.1c.8-2.4 2.7-3.6 5.3-3.6s4.5 1.2 5.3 3.6" />
            </svg>
          </button>
        )}
        {authRequired && (
          <button className="btn secondary" onClick={() => { clearToken(); navigate('/login'); window.location.reload(); }}>
            Log out
          </button>
        )}
      </nav>
      <Routes>
        <Route
          path="/"
          element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <Dashboard profile={profile} />}
        />
        <Route path="/applications" element={<Applications profile={profile} />} />
        <Route
          path="/profile"
          element={profile
            ? <Profile profile={profile} onSaved={loadProfile} />
            : <Navigate to="/onboarding" replace />}
        />
        <Route path="/onboarding" element={<Onboarding profile={profile} onDone={async () => { await loadProfile(); navigate('/'); }} />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
      </Routes>
      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
    </>
  );
}
