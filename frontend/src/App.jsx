import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase'; 

function App() {
  // Auth State
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('admin'); // 'admin' or 'patient'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  // Patient Demo State
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [patientInventory, setPatientInventory] = useState(18); // Starting demo pills

  // App State
  const [patients, setPatients] = useState([]);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [pillsDispensed, setPillsDispensed] = useState(''); 
  const [pillsPerDay, setPillsPerDay] = useState('');       
  
  // --- ENTERPRISE-GRADE MEDICAL SaaS PALETTE ---
  const theme = {
    primary: '#2563EB',      // Trust Blue 
    primaryDark: '#1E40AF',  
    primaryLight: '#EFF6FF', 
    bgBase: '#F8FAFC',       
    surface: '#FFFFFF',      
    textMain: '#0F172A',     
    textMuted: '#64748B',    
    border: '#E2E8F0',       
    danger: '#EF4444',       
    dangerLight: '#FEF2F2',  
    success: '#10B981',      
    successLight: '#ECFDF5', 
    warning: '#F59E0B'       
  };

  const layout = {
    cardShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    cardRadius: '12px',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
  };

  // 1. AUTH CHECK
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Quick role check: if it's the admin email, grant admin view
        if (currentUser.email === 'admin@dawacore.com') {
          setUserRole('admin');
        } else {
          setUserRole('patient');
        }
      }
      setIsCheckingAuth(false);
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

      // Sort by highest risk score first
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
      setAuthError('Invalid credentials. Access denied.');
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

  // LOADING SCREEN
  if (isCheckingAuth) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bgBase }}><h2 style={{ color: theme.primary }}>Loading Secure Portal...</h2></div>;

  // LOGIN SCREEN
  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: theme.bgBase, fontFamily: layout.fontFamily }}>
        <div style={{ backgroundColor: theme.surface, padding: '40px', borderRadius: '10px', boxShadow: layout.cardShadow, width: '100%', maxWidth: '400px' }}>
          <h1 style={{ color: theme.textMain, margin: '0 0 24px 0', textAlign: 'center' }}>DawaCore<span style={{color: theme.primary}}>.</span></h1>
          {authError && <div style={{ backgroundColor: theme.dangerLight, color: theme.danger, padding: '10px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>{authError}</div>}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
            <button type="submit" style={{ padding: '12px', backgroundColor: theme.primary, color: theme.surface, border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Authenticate</button>
          </form>
        </div>
      </div>
    );
  }

  // DATA CALCS
  const totalPatients = patients.length;
  const highRiskCount = patients.filter(p => p.riskScore >= 15).length;
  const adherentCount = totalPatients - highRiskCount;

  // --- MAIN ENTERPRISE APPLICATION FRAME ---
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
            <button onClick={() => setUserRole('admin')} style={navButtonStyle(userRole === 'admin', theme)}>📊 Clinical Command</button>
            <button onClick={() => setUserRole('patient')} style={navButtonStyle(userRole === 'patient', theme)}>👤 Patient Portal</button>
          </nav>
        </div>

        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '16px', paddingLeft: '8px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: theme.textMain }}>{user.email}</div>
          <div style={{ fontSize: '0.75rem', color: theme.textMuted, marginBottom: '12px', cursor: 'pointer', textDecoration: 'underline' }} onClick={handleLogout}>Secure Logout</div>
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <main style={{ marginLeft: '260px', flexGrow: 1, padding: '40px', boxSizing: 'border-box' }}>
        
        <header style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', margin: 0, color: theme.textMain }}>
            {userRole === 'admin' ? 'Triage Command Center' : 'Patient Medication Portal'}
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.95rem', color: theme.textMuted }}>
            {userRole === 'admin' ? 'Real-time adherence monitoring & automated refill tracking.' : 'Your personal prescription verification and compliance logs.'}
          </p>
        </header>

        {/* ADMIN VIEW */}
        {userRole === 'admin' && (
          <div className="fade-in">
            
            {/* Top Metrics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div style={{ ...cardStyle, borderLeft: `4px solid ${theme.primary}` }}><div style={metricLabelStyle}>Total Monitored Patients</div><div style={metricValueStyle(theme.textMain)}>{totalPatients}</div></div>
              <div style={{ ...cardStyle, borderLeft: `4px solid ${theme.danger}` }}><div style={metricLabelStyle}>High Risk Alerts (≥15)</div><div style={metricValueStyle(theme.danger)}>{highRiskCount}</div></div>
              <div style={{ ...cardStyle, borderLeft: `4px solid ${theme.success}` }}><div style={metricLabelStyle}>Fully Adherent</div><div style={metricValueStyle(theme.success)}>{adherentCount}</div></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
              {/* Registration Form */}
              <div style={{ ...cardStyle, padding: '24px' }}>
                <h3 style={{ marginTop: '0', color: theme.textMain, fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ backgroundColor: theme.primaryLight, color: theme.primary, padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>ACTION</span> Register New Prescription</h3>
                <form onSubmit={handleAddPatient} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'end' }}>
                  <div><label style={labelStyle}>Patient Name</label><input type="text" placeholder="e.g. Jane Doe" value={newName} onChange={(e) => setNewName(e.target.value)} required style={inputStyle} /></div>
                  <div><label style={labelStyle}>Mobile Number</label><input type="text" placeholder="+254..." value={newPhone} onChange={(e) => setNewPhone(e.target.value)} required style={inputStyle} /></div>
                  <div><label style={labelStyle}>Medication</label><input type="text" placeholder="e.g. Metformin" value={newMedication} onChange={(e) => setNewMedication(e.target.value)} style={inputStyle} /></div>
                  <div style={{ display: 'flex', gap: '12px' }}><div style={{ flex: 1 }}><label style={labelStyle}>Total Pills</label><input type="number" placeholder="30" value={pillsDispensed} onChange={(e) => setPillsDispensed(e.target.value)} style={inputStyle} /></div><div style={{ flex: 1 }}><label style={labelStyle}>Daily Dose</label><input type="number" placeholder="1" value={pillsPerDay} onChange={(e) => setPillsPerDay(e.target.value)} style={inputStyle} /></div></div>
                  <button type="submit" style={{ padding: '10px 16px', height: '42px', backgroundColor: theme.primary, color: theme.surface, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem' }}>Enroll Patient</button>
                </form>
              </div>

              {/* Triage Queue Table */}
              <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: `1px solid ${theme.border}`, backgroundColor: theme.surface }}><h3 style={{ margin: 0, color: theme.textMain, fontSize: '1.1rem' }}>Live Triage Queue</h3></div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ backgroundColor: theme.bgBase, color: theme.textMuted, textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase' }}><th style={thStyle}>Patient Profile</th><th style={thStyle}>Contact</th><th style={thStyle}>Regimen & Inventory</th><th style={thStyle}>Refill Forecast</th><th style={thStyle}>Status</th></tr></thead>
                    <tbody>
                      {patients.length === 0 ? (<tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: theme.textMuted }}>No active patients.</td></tr>) : (
                        patients.map((patient) => {
                          const currentPills = patient.pillsRemaining !== undefined ? patient.pillsRemaining : 30;
                          const dose = patient.pillsPerDay || 1;
                          const daysLeft = Math.floor(currentPills / dose);
                          const depletionDate = new Date(); depletionDate.setDate(depletionDate.getDate() + daysLeft);
                          const needsRefill = daysLeft <= 5 && daysLeft > 0; 
                          const isOut = daysLeft <= 0;
                          
                          return (
                            <tr key={patient.id} style={{ borderBottom: `1px solid ${theme.border}`, backgroundColor: patient.riskScore >= 15 ? theme.dangerLight : theme.surface }}>
                              <td style={tdStyle}><div style={{ fontWeight: '600', color: theme.textMain }}>{patient.firstName}</div><div style={subTextStyle}>Enrolled: {patient.enrolledAt ? new Date(patient.enrolledAt).toLocaleDateString() : 'N/A'}</div></td>
                              <td style={tdStyle}>{patient.phoneNumber}</td>
                              <td style={tdStyle}><div style={{ fontWeight: '500', color: theme.textMain }}>{patient.medication}</div><div style={subTextStyle}>{dose}x daily · <span style={{fontWeight: '600', color: theme.success}}>{currentPills} pills</span></div></td>
                              <td style={tdStyle}><div style={{ fontWeight: '600', color: isOut ? theme.danger : needsRefill ? theme.warning : theme.textMain }}>{isOut ? 'Depleted' : depletionDate.toLocaleDateString()}</div><div style={{ fontSize: '0.8rem', color: isOut ? theme.danger : needsRefill ? theme.warning : theme.textMuted }}>{isOut ? 'Action Required' : needsRefill ? 'Refill Soon' : 'Stable'}</div></td>
                              <td style={tdStyle}><div style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', display: 'inline-block', fontWeight: '600', textTransform: 'uppercase', backgroundColor: patient.riskScore >= 15 ? theme.danger : theme.successLight, color: patient.riskScore >= 15 ? theme.surface : theme.success }}>{patient.riskScore >= 15 ? `High Risk (${patient.riskScore})` : `Adherent (${patient.riskScore})`}</div></td>
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

        {/* PATIENT VIEW */}
        {userRole === 'patient' && (
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
        )}
      </main>
    </div>
  );
}

// --- REUSABLE STYLES ---
const cardStyle = { backgroundColor: '#ffffff', borderRadius: '10px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', padding: '24px' };
const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.95rem', color: '#0f172a', outline: 'none', boxSizing: 'border-box' };
const thStyle = { padding: '12px 24px', fontWeight: '600' };
const tdStyle = { padding: '16px 24px' };
const subTextStyle = { fontSize: '0.8rem', color: '#64748b', marginTop: '2px' };
const metricLabelStyle = { fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' };
const metricValueStyle = (color) => ({ fontSize: '2rem', fontWeight: '700', color: color, marginTop: '8px' });
const navButtonStyle = (isActive, theme) => ({ display: 'flex', alignItems: 'center', width: '100%', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', backgroundColor: isActive ? theme.primaryLight : 'transparent', color: isActive ? theme.primary : theme.textMuted, transition: 'all 0.2s', textAlign: 'left' });

export default App;