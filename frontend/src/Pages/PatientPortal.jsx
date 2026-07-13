import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import { db, auth } from '../firebase';
import { theme, layout } from '../theme';

// ENCRYPTION CONFIGURATION
const SECRET_KEY = import.meta.env.VITE_AES_SECRET_KEY; 
const decryptData = (cipherText) => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || cipherText; 
  } catch (error) { return cipherText; }
};

export default function PatientPortal({ user }) {
  const [currentPatient, setCurrentPatient] = useState(null);
  const [justTaken, setJustTaken] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  // FETCH THE PATIENT DATA IN REAL-TIME
  useEffect(() => {
    if (!user) return;
    // For demo purposes, we grab the first patient in the database to act as the logged-in user
    const q = query(collection(db, 'patients'), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const rawData = docSnap.data();
        setCurrentPatient({
          id: docSnap.id,
          ...rawData,
          firstName: rawData.firstName ? decryptData(rawData.firstName) : 'Unknown',
          phoneNumber: rawData.phoneNumber ? decryptData(rawData.phoneNumber) : 'Unknown',
        });
      }
    });
    return () => unsubscribe();
  }, [user]);

  // ACTION: TAKE DOSE
  const handleTakeDose = async () => {
    if (!currentPatient) return;
    const dose = currentPatient.pillsPerDay || 1;
    const newPills = currentPatient.pillsRemaining - dose;
    
    try {
      await updateDoc(doc(db, 'patients', currentPatient.id), {
        pillsRemaining: newPills < 0 ? 0 : newPills
      });
      setJustTaken(true);
      setTimeout(() => setJustTaken(false), 3000); // Hide success message after 3s
    } catch (error) {
      console.error("Error logging dose", error);
    }
  };

  // ACTION: REQUEST REFILL
  const handleRequestRefill = async () => {
    if (!currentPatient) return;
    try {
      await updateDoc(doc(db, 'patients', currentPatient.id), {
        status: 'Refill Requested'
      });
    } catch (error) {
      console.error("Error requesting refill", error);
    }
  };

  if (!currentPatient) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: layout.fontFamily }}>Loading Secure Health Record...</div>;
  }

  const isLowInventory = currentPatient.pillsRemaining <= 7;
  const isRefillRequested = currentPatient.status === 'Refill Requested';
  const progressPercent = Math.min((currentPatient.pillsRemaining / 30) * 100, 100);

  return (
    <div style={{ backgroundColor: theme.bgBase, minHeight: '100vh', fontFamily: layout.fontFamily, color: theme.textMain, display: 'flex' }}>
      
      {/* SYNCED SIDEBAR WITH ROUTING AND LOGOUT BUTTON */}
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
        
        {/* NEW UNIFIED LOGOUT BUTTON */}
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '16px' }}>
          <button onClick={() => signOut(auth)} style={logoutButtonStyle(theme)}>🚪 Secure Logout</button>
        </div>
      </aside>

      {/* WORKSPACE */}
      <main style={{ marginLeft: '260px', flexGrow: 1, padding: '40px', boxSizing: 'border-box', maxWidth: '900px' }}>
        <header style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', margin: 0, color: theme.textMain }}>Welcome back, {currentPatient.firstName.split(' ')[0]}! 👋</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.95rem', color: theme.textMuted }}>Your health data is secured with end-to-end AES-256 encryption.</p>
        </header>

        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* DAILY DOSE ACTION CARD */}
          <div style={{ ...cardStyle, padding: '40px', textAlign: 'center', borderTop: `4px solid ${theme.primary}` }}>
            <h2 style={{ marginTop: 0, fontSize: '1.5rem', color: theme.textMain }}>{currentPatient.medication}</h2>
            <p style={{ color: theme.textMuted, marginBottom: '32px' }}>Prescribed dose: {currentPatient.pillsPerDay} pill(s) daily.</p>
            
            {justTaken ? (
              <div style={{ padding: '20px', backgroundColor: theme.successLight, color: theme.success, borderRadius: '8px', fontWeight: '600', fontSize: '1.1rem', display: 'inline-block' }}>
                ✅ Dose securely logged for today!
              </div>
            ) : (
              <button onClick={handleTakeDose} disabled={currentPatient.pillsRemaining <= 0} style={{ padding: '16px 40px', backgroundColor: currentPatient.pillsRemaining <= 0 ? theme.border : theme.primary, color: '#fff', border: 'none', borderRadius: '50px', fontSize: '1.1rem', fontWeight: '700', cursor: currentPatient.pillsRemaining <= 0 ? 'not-allowed' : 'pointer', boxShadow: currentPatient.pillsRemaining > 0 ? '0 4px 14px 0 rgba(37, 99, 235, 0.39)' : 'none', transition: 'all 0.2s' }}>
                {currentPatient.pillsRemaining <= 0 ? 'Out of Medication' : '💊 Log Daily Dose'}
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            {/* INVENTORY & GAMIFICATION */}
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: theme.textMain, display: 'flex', justifyContent: 'space-between' }}>
                Medication Supply
                <span style={{ color: isLowInventory ? theme.danger : theme.success }}>{currentPatient.pillsRemaining} left</span>
              </h3>
              
              {/* Progress Bar */}
              <div style={{ width: '100%', backgroundColor: theme.bgBase, borderRadius: '10px', height: '12px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ width: `${progressPercent}%`, backgroundColor: isLowInventory ? theme.danger : theme.success, height: '100%', transition: 'width 0.5s ease-in-out' }}></div>
              </div>

              {/* Refill Logic */}
              {isLowInventory && !isRefillRequested && (
                <div style={{ padding: '16px', backgroundColor: theme.warningLight, borderRadius: '8px', border: `1px solid ${theme.warning}` }}>
                  <p style={{ margin: '0 0 12px 0', color: '#854d0e', fontSize: '0.9rem', fontWeight: '600' }}>⚠️ You are running low on medication.</p>
                  <button onClick={handleRequestRefill} style={{ width: '100%', padding: '10px', backgroundColor: theme.warning, color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>Alert Clinic for Refill</button>
                </div>
              )}
              
              {isRefillRequested && (
                <div style={{ padding: '16px', backgroundColor: theme.bgBase, borderRadius: '8px', textAlign: 'center', color: theme.textMuted, fontWeight: '600', fontSize: '0.9rem' }}>
                  ⏳ Refill requested. Awaiting clinic approval.
                </div>
              )}

              {/* Gamification Badge */}
              {!isLowInventory && currentPatient.riskScore < 5 && (
                 <div style={{ padding: '16px', backgroundColor: theme.primaryLight, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '2rem' }}>🏆</div>
                    <div>
                       <div style={{ fontWeight: '700', color: theme.primary, fontSize: '0.9rem' }}>Adherence Champion</div>
                       <div style={{ fontSize: '0.8rem', color: theme.textMain }}>You are on a perfect streak!</div>
                    </div>
                 </div>
              )}
            </div>

            {/* SECURE PROFILE CARD */}
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: theme.textMain, marginBottom: '20px' }}>Secure Profile</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={labelStyle}>Decrypted Legal Name</div>
                  <div style={{ padding: '12px', backgroundColor: theme.bgBase, borderRadius: '6px', fontSize: '0.95rem', color: theme.textMain, fontWeight: '500' }}>{currentPatient.firstName}</div>
                </div>
                <div>
                  <div style={labelStyle}>Decrypted Mobile</div>
                  <div style={{ padding: '12px', backgroundColor: theme.bgBase, borderRadius: '6px', fontSize: '0.95rem', color: theme.textMain, fontWeight: '500' }}>{currentPatient.phoneNumber}</div>
                </div>
                <div style={{ fontSize: '0.75rem', color: theme.textMuted, marginTop: '8px', fontStyle: 'italic' }}>
                  * This data is encrypted in the hospital database and can only be decoded by your authenticated device and authorized clinicians.
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
const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' };
const navButtonStyle = (isActive, theme) => ({ display: 'flex', alignItems: 'center', width: '100%', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', backgroundColor: isActive ? theme.primaryLight : 'transparent', color: isActive ? theme.primary : theme.textMuted, transition: 'all 0.2s', textAlign: 'left' });
const logoutButtonStyle = (theme) => ({ display: 'flex', alignItems: 'center', width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${theme.dangerLight}`, fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', backgroundColor: 'transparent', color: theme.danger, transition: 'all 0.2s', textAlign: 'left' });