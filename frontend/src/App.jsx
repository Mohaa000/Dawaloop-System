import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase'; 

function App() {
  // Auth State
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // App State
  const [patients, setPatients] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard'); 
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [pillsDispensed, setPillsDispensed] = useState(''); 
  const [pillsPerDay, setPillsPerDay] = useState('');       

// --- THEME COLORS ---
  const theme = {
    primaryGreen: '#10b981', darkGreen: '#047857', lightGreen: '#ecfdf5',
    white: '#ffffff', bgLight: '#f1f5f9', textDark: '#0f172a',
    textMuted: '#64748b', border: '#e2e8f0', danger: '#ef4444',
    dangerLight: '#fef2f2', warning: '#f59e0b',
  };

  // 1. MISSING AUTH CHECK RESTORED
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsCheckingAuth(false); // This tells the white screen to go away!
    });
    return () => unsubscribeAuth();
  }, []);

  // 2. UNIFIED FETCH AND TRIAGE SORT
  useEffect(() => {
    if (!user) return;
    
    const patientsRef = collection(db, 'patients');
    const unsubscribe = onSnapshot(patientsRef, (snapshot) => {
      const patientData = snapshot.docs.map(doc => ({
        id: doc.id, ...doc.data()
      }));

      // --- THE TRIAGE ALGORITHM (Sorting) ---
      patientData.sort((a, b) => {
        const riskA = a.riskScore || 0;
        const riskB = b.riskScore || 0;
        return riskB - riskA; 
      });

      setPatients(patientData);
    });
    
    return () => unsubscribe();
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setAuthError('');
    } catch (error) {
      setAuthError('Invalid admin credentials. Access denied.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleAddPatient = async (e) => {
    e.preventDefault(); 
    if (!newName || !newPhone) return;
    try {
      await addDoc(collection(db, 'patients'), {
        firstName: newName,
        phoneNumber: newPhone.startsWith('+') ? newPhone : `+${newPhone}`,
        medication: newMedication || 'General',
        pillsRemaining: parseInt(pillsDispensed) || 30, 
        pillsPerDay: parseInt(pillsPerDay) || 1,        
        riskScore: 0,
        status: 'Active',
        enrolledAt: new Date().toISOString()
      });
      setNewName(''); setNewPhone(''); setNewMedication(''); setPillsDispensed(''); setPillsPerDay('');
    } catch (error) {
      console.error("Error adding patient: ", error);
    }
  };

if (isCheckingAuth) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bgLight }}><h2 style={{ color: theme.darkGreen }}>Loading Secure Portal...</h2></div>;

  // --- LOGIN SCREEN (Tier 1 Security) ---
  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: theme.bgLight, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ backgroundColor: theme.white, padding: '40px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
          <h1 style={{ color: theme.darkGreen, margin: '0 0 24px 0', textAlign: 'center' }}>DawaCore<span style={{color: theme.primaryGreen}}>.</span> Secure Portal</h1>
          {authError && <div style={{ backgroundColor: theme.dangerLight, color: theme.danger, padding: '10px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>{authError}</div>}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="email" placeholder="Admin Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
            <button type="submit" style={{ padding: '12px', backgroundColor: theme.primaryGreen, color: theme.white, border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Authenticate</button>
          </form>
        </div>
      </div>
    );
  }

  // --- MAIN APPLICATION (Protected) ---
  const totalPatients = patients.length;
  const highRiskCount = patients.filter(p => p.riskScore >= 15).length;
  const adherentCount = totalPatients - highRiskCount;

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: theme.bgLight, minHeight: '100vh', margin: 0, paddingBottom: '40px' }}>
      <nav style={{ backgroundColor: theme.white, borderBottom: `1px solid ${theme.border}`, padding: '12px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: theme.textDark, fontWeight: '500', padding: '8px 12px', borderRadius: '6px', backgroundColor: isMenuOpen ? theme.bgLight : 'transparent' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            Menu
          </div>
          {isMenuOpen && (
            <div style={{ position: 'absolute', top: '60px', left: '30px', backgroundColor: theme.white, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', borderRadius: '8px', border: `1px solid ${theme.border}`, minWidth: '240px', overflow: 'hidden' }}>
              {['dashboard', 'analytics', 'settings'].map((page) => (
                <div key={page} onClick={() => {setCurrentPage(page); setIsMenuOpen(false);}} style={{ padding: '14px 20px', cursor: 'pointer', borderBottom: `1px solid ${theme.border}`, color: currentPage === page ? theme.primaryGreen : theme.textDark, fontWeight: currentPage === page ? '600' : '400', backgroundColor: currentPage === page ? theme.lightGreen : theme.white, textTransform: 'capitalize' }}>
                  {page === 'dashboard' ? '🏥 Triage Dashboard' : page === 'analytics' ? '📊 System Analytics' : '⚙️ Configuration'}
                </div>
              ))}
            </div>
          )}
          <h1 style={{ margin: '0 0 0 20px', color: theme.darkGreen, fontSize: '1.4rem', fontWeight: '700' }}>DawaCore<span style={{color: theme.primaryGreen}}>.</span></h1>
        </div>
        <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: theme.bgLight, color: theme.textDark, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}>Secure Logout</button>
      </nav>

      <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
        {currentPage === 'dashboard' && (
          <div className="fade-in">
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ color: theme.textDark, margin: '0 0 4px 0', fontSize: '1.75rem', fontWeight: '700' }}>Triage Command Center</h2>
              <p style={{ color: theme.textMuted, margin: 0, fontSize: '0.95rem' }}>Real-time adherence monitoring and automated refill tracking.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div style={{ ...cardStyle, borderLeft: `4px solid ${theme.primaryGreen}` }}><div style={metricLabelStyle}>Total Monitored Patients</div><div style={metricValueStyle(theme.textDark)}>{totalPatients}</div></div>
              <div style={{ ...cardStyle, borderLeft: `4px solid ${theme.danger}` }}><div style={metricLabelStyle}>High Risk Alerts (≥15)</div><div style={metricValueStyle(theme.danger)}>{highRiskCount}</div></div>
              <div style={{ ...cardStyle, borderLeft: `4px solid ${theme.darkGreen}` }}><div style={metricLabelStyle}>Fully Adherent</div><div style={metricValueStyle(theme.darkGreen)}>{adherentCount}</div></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
              <div style={{ ...cardStyle, padding: '24px' }}>
                <h3 style={{ marginTop: '0', color: theme.textDark, fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ backgroundColor: theme.lightGreen, color: theme.darkGreen, padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>ACTION</span> Register New Prescription</h3>
                <form onSubmit={handleAddPatient} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'end' }}>
                  <div><label style={labelStyle}>Patient Name</label><input type="text" placeholder="e.g. Jane Doe" value={newName} onChange={(e) => setNewName(e.target.value)} required style={inputStyle} /></div>
                  <div><label style={labelStyle}>Mobile Number</label><input type="text" placeholder="+254..." value={newPhone} onChange={(e) => setNewPhone(e.target.value)} required style={inputStyle} /></div>
                  <div><label style={labelStyle}>Medication</label><input type="text" placeholder="e.g. Metformin" value={newMedication} onChange={(e) => setNewMedication(e.target.value)} style={inputStyle} /></div>
                  <div style={{ display: 'flex', gap: '12px' }}><div style={{ flex: 1 }}><label style={labelStyle}>Total Pills</label><input type="number" placeholder="30" value={pillsDispensed} onChange={(e) => setPillsDispensed(e.target.value)} style={inputStyle} /></div><div style={{ flex: 1 }}><label style={labelStyle}>Daily Dose</label><input type="number" placeholder="1" value={pillsPerDay} onChange={(e) => setPillsPerDay(e.target.value)} style={inputStyle} /></div></div>
                  <button type="submit" style={{ padding: '10px 16px', height: '42px', backgroundColor: theme.primaryGreen, color: theme.white, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem' }}>Enroll Patient</button>
                </form>
              </div>
              <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: `1px solid ${theme.border}`, backgroundColor: theme.white }}><h3 style={{ margin: 0, color: theme.textDark, fontSize: '1.1rem' }}>Live Triage Queue</h3></div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ backgroundColor: theme.bgLight, color: theme.textMuted, textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase' }}><th style={thStyle}>Patient Profile</th><th style={thStyle}>Contact</th><th style={thStyle}>Regimen & Inventory</th><th style={thStyle}>Refill Forecast</th><th style={thStyle}>Status</th></tr></thead>
                    <tbody>
                      {patients.length === 0 ? (<tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: theme.textMuted }}>No active patients.</td></tr>) : (
                        patients.map((patient) => {
                          const currentPills = patient.pillsRemaining !== undefined ? patient.pillsRemaining : 30;
                          const dose = patient.pillsPerDay || 1;
                          const daysLeft = Math.floor(currentPills / dose);
                          const depletionDate = new Date(); depletionDate.setDate(depletionDate.getDate() + daysLeft);
                          const needsRefill = daysLeft <= 5 && daysLeft > 0; const isOut = daysLeft <= 0;
                          return (
                            <tr key={patient.id} style={{ borderBottom: `1px solid ${theme.border}`, backgroundColor: patient.riskScore >= 15 ? theme.dangerLight : theme.white }}>
                              <td style={tdStyle}><div style={{ fontWeight: '600', color: theme.textDark }}>{patient.firstName}</div><div style={subTextStyle}>Enrolled: {patient.enrolledAt ? new Date(patient.enrolledAt).toLocaleDateString() : 'N/A'}</div></td>
                              <td style={tdStyle}>{patient.phoneNumber}</td>
                              <td style={tdStyle}><div style={{ fontWeight: '500', color: theme.textDark }}>{patient.medication}</div><div style={subTextStyle}>{dose}x daily · <span style={{fontWeight: '600', color: theme.darkGreen}}>{currentPills} pills</span></div></td>
                              <td style={tdStyle}><div style={{ fontWeight: '600', color: isOut ? theme.danger : needsRefill ? theme.warning : theme.textDark }}>{isOut ? 'Depleted' : depletionDate.toLocaleDateString()}</div><div style={{ fontSize: '0.8rem', color: isOut ? theme.danger : needsRefill ? theme.warning : theme.textMuted }}>{isOut ? 'Action Required' : needsRefill ? 'Refill Soon' : 'Stable'}</div></td>
                              <td style={tdStyle}><div style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', display: 'inline-block', fontWeight: '600', textTransform: 'uppercase', backgroundColor: patient.riskScore >= 15 ? theme.danger : theme.lightGreen, color: patient.riskScore >= 15 ? theme.white : theme.darkGreen }}>{patient.riskScore >= 15 ? `High Risk (${patient.riskScore})` : `Adherent (${patient.riskScore})`}</div></td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
        {currentPage === 'analytics' && (<div className="fade-in"><h2 style={{ color: theme.textDark, margin: '0 0 4px 0', fontSize: '1.75rem', fontWeight: '700' }}>System Analytics</h2><p style={{ color: theme.textMuted, marginBottom: '24px' }}>Comprehensive overview of clinic adherence rates and system performance.</p><div style={{ ...cardStyle, padding: '60px', textAlign: 'center', border: `1px dashed ${theme.primaryGreen}` }}><div style={{ fontSize: '3rem', marginBottom: '16px' }}>📈</div><h3 style={{ color: theme.darkGreen, margin: '0 0 8px 0' }}>Analytics Module Ready</h3><p style={{ color: theme.textMuted, maxWidth: '400px', margin: '0 auto' }}>Ready to integrate data visualization.</p></div></div>)}
        {currentPage === 'settings' && (<div className="fade-in"><h2 style={{ color: theme.textDark, margin: '0 0 4px 0', fontSize: '1.75rem', fontWeight: '700' }}>Configuration</h2><p style={{ color: theme.textMuted, marginBottom: '24px' }}>Manage clinic details, SMS templates, and administrative access.</p><div style={{ ...cardStyle, padding: '60px', textAlign: 'center' }}><h3 style={{ color: theme.textDark, margin: '0 0 8px 0' }}>System Settings</h3><p style={{ color: theme.textMuted }}>Administrative controls will be populated here.</p></div></div>)}
      </div>
    </div>
  );
}

// --- REUSABLE STYLES ---
const cardStyle = { backgroundColor: '#ffffff', borderRadius: '10px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0', padding: '24px' };
const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.95rem', color: '#0f172a', outline: 'none', boxSizing: 'border-box' };
const thStyle = { padding: '12px 24px', fontWeight: '600' };
const tdStyle = { padding: '16px 24px' };
const subTextStyle = { fontSize: '0.8rem', color: '#64748b', marginTop: '2px' };
const metricLabelStyle = { fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' };
const metricValueStyle = (color) => ({ fontSize: '2rem', fontWeight: '700', color: color, marginTop: '8px' });

export default App;