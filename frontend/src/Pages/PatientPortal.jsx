import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { theme, layout } from '../theme';

export default function PatientPortal({ user }) {
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [patientInventory, setPatientInventory] = useState(18); // Starting demo pills
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div style={{ backgroundColor: theme.bgBase, minHeight: '100vh', fontFamily: layout.fontFamily, color: theme.textMain, display: 'flex' }}>
      
      {/* PROFESSIONAL SIDEBAR */}
      <aside style={{ width: '260px', backgroundColor: theme.surface, borderRight: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px 16px', position: 'fixed', height: '100vh', boxSizing: 'border-box' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', paddingLeft: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: theme.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '1.2rem' }}>D</div>
            <span style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.025em', color: theme.textMain }}>Dawa<span style={{ color: theme.primary }}>Core</span></span>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={() => navigate('/portal')} style={navButtonStyle(location.pathname === '/portal', theme)}>👤 Daily Dose</button>
            <button onClick={() => navigate('/portal/analytics')} style={navButtonStyle(location.pathname === '/portal/analytics', theme)}>📈 My Progress</button>
          </nav>
        </div>
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '16px', paddingLeft: '8px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: theme.textMain }}>{user.email}</div>
          <div style={{ fontSize: '0.75rem', color: theme.textMuted, marginBottom: '12px', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => signOut(auth)}>Secure Logout</div>
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <main style={{ marginLeft: '260px', flexGrow: 1, padding: '40px', boxSizing: 'border-box' }}>
        <header style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', margin: 0, color: theme.textMain }}>Patient Medication Portal</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.95rem', color: theme.textMuted }}>Your personal prescription verification and compliance logs.</p>
        </header>

        <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Welcome Banner */}
          <div style={{ ...cardStyle, padding: '32px', marginBottom: '24px', backgroundColor: theme.primary, color: theme.surface, border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '1.8rem' }}>Good morning, {user?.email?.split('@')[0] || 'Patient'}</h2>
              <p style={{ margin: 0, opacity: 0.9 }}>Your treatment plan is on track. Keep it up!</p>
            </div>
            <div style={{ fontSize: '3.5rem' }}>🌿</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {/* Daily Action Card */}
            <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px 24px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 8px 0', color: theme.textMain }}>Today's Medication</h3>
              <p style={{ color: theme.textMuted, margin: '0 0 24px 0', fontSize: '0.95rem' }}>Metformin (500mg) - 1 Pill</p>
              
              {!hasCheckedIn ? (
                <button 
                  onClick={() => { setHasCheckedIn(true); setPatientInventory(prev => prev - 1); }}
                  style={{ backgroundColor: theme.success, color: theme.surface, border: 'none', padding: '16px 32px', borderRadius: '50px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)', transition: 'all 0.2s' }}
                >
                  ✓ Log Today's Dose
                </button>
              ) : (
                <div className="fade-in" style={{ backgroundColor: theme.successLight, color: theme.success, padding: '16px 32px', borderRadius: '50px', fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🎉 Dose Logged for Today!
                </div>
              )}
            </div>

            {/* Inventory & Refill Card */}
            <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: '0 0 16px 0', color: theme.textMain }}>Prescription Status</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: theme.textMain }}>
                  <span>Pills Remaining</span>
                  <span>{patientInventory} / 30</span>
                </div>
                {/* Dynamic Progress Bar */}
                <div style={{ width: '100%', backgroundColor: theme.border, borderRadius: '8px', height: '12px', overflow: 'hidden', marginBottom: '24px' }}>
                  <div style={{ width: `${(patientInventory / 30) * 100}%`, backgroundColor: patientInventory > 10 ? theme.primary : theme.warning, height: '100%', transition: 'width 0.5s ease' }}></div>
                </div>
              </div>

              <div style={{ backgroundColor: theme.bgBase, padding: '16px', borderRadius: '8px', borderLeft: `4px solid ${patientInventory > 10 ? theme.primary : theme.warning}` }}>
                <div style={{ fontSize: '0.8rem', color: theme.textMuted, textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>Estimated Refill Date</div>
                <div style={{ fontSize: '1.1rem', color: theme.textMain, fontWeight: '700' }}>
                  {new Date(Date.now() + patientInventory * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// REUSABLE STYLES
const cardStyle = { backgroundColor: '#ffffff', borderRadius: '10px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', padding: '24px' };
const navButtonStyle = (isActive, theme) => ({ display: 'flex', alignItems: 'center', width: '100%', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', backgroundColor: isActive ? theme.primaryLight : 'transparent', color: isActive ? theme.primary : theme.textMuted, transition: 'all 0.2s', textAlign: 'left' });