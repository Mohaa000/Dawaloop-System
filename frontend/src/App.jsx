import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase'; 

function App() {
  const [patients, setPatients] = useState([]);
  
  // Navigation State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard'); 

  // Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [pillsDispensed, setPillsDispensed] = useState(''); 
  const [pillsPerDay, setPillsPerDay] = useState('');       

  useEffect(() => {
    const patientsRef = collection(db, 'patients');
    const q = query(patientsRef, orderBy('riskScore', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const patientData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPatients(patientData);
    });

    return () => unsubscribe();
  }, []);

  const handleAddPatient = async (e) => {
    e.preventDefault(); 
    if (!newName || !newPhone) {
      alert("Please enter at least a name and phone number!");
      return;
    }
    try {
      const patientsRef = collection(db, 'patients');
      await addDoc(patientsRef, {
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

  // --- DYNAMIC METRICS CALCULATIONS ---
  const totalPatients = patients.length;
  const highRiskCount = patients.filter(p => p.riskScore >= 15).length;
  const adherentCount = totalPatients - highRiskCount;

  // --- THEME COLORS ---
  const theme = {
    primaryGreen: '#10b981',
    darkGreen: '#047857',
    lightGreen: '#ecfdf5',
    white: '#ffffff',
    bgLight: '#f1f5f9',
    textDark: '#0f172a',
    textMuted: '#64748b',
    border: '#e2e8f0',
    danger: '#ef4444',
    dangerLight: '#fef2f2',
    warning: '#f59e0b',
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: theme.bgLight, minHeight: '100vh', margin: 0, paddingBottom: '40px' }}>
      
      {/* --- TOP NAVIGATION BAR --- */}
      <nav style={{ 
        backgroundColor: theme.white, 
        borderBottom: `1px solid ${theme.border}`, 
        padding: '12px 30px', 
        display: 'flex', 
        alignItems: 'center', 
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
      }}>
        <div 
          onClick={() => setIsMenuOpen(!isMenuOpen)} 
          style={{ 
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', 
            color: theme.textDark, fontWeight: '500', padding: '8px 12px',
            borderRadius: '6px', backgroundColor: isMenuOpen ? theme.bgLight : 'transparent',
            transition: 'background 0.2s'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
          Menu
        </div>

        {isMenuOpen && (
          <div style={{ 
            position: 'absolute', top: '60px', left: '30px', backgroundColor: theme.white, 
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', 
            borderRadius: '8px', zIndex: 1000, border: `1px solid ${theme.border}`, minWidth: '240px', overflow: 'hidden'
          }}>
            {['dashboard', 'analytics', 'settings'].map((page) => (
              <div 
                key={page}
                onClick={() => {setCurrentPage(page); setIsMenuOpen(false);}} 
                style={{ 
                  padding: '14px 20px', cursor: 'pointer', borderBottom: `1px solid ${theme.border}`, 
                  color: currentPage === page ? theme.primaryGreen : theme.textDark, 
                  fontWeight: currentPage === page ? '600' : '400', 
                  backgroundColor: currentPage === page ? theme.lightGreen : theme.white,
                  textTransform: 'capitalize'
                }}
              >
                {page === 'dashboard' ? '🏥 Triage Dashboard' : page === 'analytics' ? '📊 System Analytics' : '⚙️ Configuration'}
              </div>
            ))}
          </div>
        )}

        <h1 style={{ margin: '0 0 0 20px', color: theme.darkGreen, fontSize: '1.4rem', fontWeight: '700', letterSpacing: '-0.5px' }}>
          DawaLoop<span style={{color: theme.primaryGreen}}>.</span>
        </h1>
      </nav>

      {/* --- MAIN CONTENT AREA --- */}
      <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
        
        {currentPage === 'dashboard' && (
          <div className="fade-in">
            
            {/* HEADER */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ color: theme.textDark, margin: '0 0 4px 0', fontSize: '1.75rem', fontWeight: '700' }}>Triage Command Center</h2>
              <p style={{ color: theme.textMuted, margin: 0, fontSize: '0.95rem' }}>Real-time adherence monitoring and automated refill tracking.</p>
            </div>

            {/* --- TOP METRICS GRID --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              
              <div style={{ ...cardStyle, borderLeft: `4px solid ${theme.primaryGreen}` }}>
                <div style={{ fontSize: '0.85rem', color: theme.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Monitored Patients</div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: theme.textDark, marginTop: '8px' }}>{totalPatients}</div>
              </div>

              <div style={{ ...cardStyle, borderLeft: `4px solid ${theme.danger}` }}>
                <div style={{ fontSize: '0.85rem', color: theme.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>High Risk Alerts (≥15)</div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: theme.danger, marginTop: '8px' }}>{highRiskCount}</div>
              </div>

              <div style={{ ...cardStyle, borderLeft: `4px solid ${theme.darkGreen}` }}>
                <div style={{ fontSize: '0.85rem', color: theme.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fully Adherent</div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: theme.darkGreen, marginTop: '8px' }}>{adherentCount}</div>
              </div>

            </div>

            {/* --- ACTION & DATA GRID --- */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
              
              {/* REGISTRATION MODULE */}
              <div style={{ ...cardStyle, padding: '24px' }}>
                <h3 style={{ marginTop: '0', color: theme.textDark, fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ backgroundColor: theme.lightGreen, color: theme.darkGreen, padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>ACTION</span>
                  Register New Prescription
                </h3>
                <form onSubmit={handleAddPatient} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'end' }}>
                  <div>
                    <label style={labelStyle}>Patient Name</label>
                    <input type="text" placeholder="e.g. Jane Doe" value={newName} onChange={(e) => setNewName(e.target.value)} required style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Mobile Number</label>
                    <input type="text" placeholder="+254..." value={newPhone} onChange={(e) => setNewPhone(e.target.value)} required style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Medication</label>
                    <input type="text" placeholder="e.g. Metformin" value={newMedication} onChange={(e) => setNewMedication(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Total Pills</label>
                      <input type="number" placeholder="30" value={pillsDispensed} onChange={(e) => setPillsDispensed(e.target.value)} style={inputStyle} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Daily Dose</label>
                      <input type="number" placeholder="1" value={pillsPerDay} onChange={(e) => setPillsPerDay(e.target.value)} style={inputStyle} />
                    </div>
                  </div>
                  <button type="submit" style={{ padding: '10px 16px', height: '42px', backgroundColor: theme.primaryGreen, color: theme.white, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', transition: 'background 0.2s', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)' }}>
                    Enroll Patient
                  </button>
                </form>
              </div>

              {/* LIVE TRIAGE QUEUE */}
              <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: `1px solid ${theme.border}`, backgroundColor: theme.white }}>
                  <h3 style={{ margin: 0, color: theme.textDark, fontSize: '1.1rem' }}>Live Triage Queue</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: theme.bgLight, color: theme.textMuted, textAlign: 'left', fontSize: '0.8rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px 24px', fontWeight: '600' }}>Patient Profile</th>
                        <th style={{ padding: '12px 24px', fontWeight: '600' }}>Contact</th>
                        <th style={{ padding: '12px 24px', fontWeight: '600' }}>Regimen & Inventory</th>
                        <th style={{ padding: '12px 24px', fontWeight: '600' }}>Refill Forecast</th>
                        <th style={{ padding: '12px 24px', fontWeight: '600' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patients.length === 0 ? (
                        <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: theme.textMuted }}>No active patients.</td></tr>
                      ) : (
                        patients.map((patient) => {
                          const currentPills = patient.pillsRemaining !== undefined ? patient.pillsRemaining : 30;
                          const dose = patient.pillsPerDay || 1;
                          const daysLeft = Math.floor(currentPills / dose);
                          const depletionDate = new Date();
                          depletionDate.setDate(depletionDate.getDate() + daysLeft);
                          const needsRefill = daysLeft <= 5 && daysLeft > 0;
                          const isOut = daysLeft <= 0;

                          return (
                            <tr key={patient.id} style={{ borderBottom: `1px solid ${theme.border}`, backgroundColor: patient.riskScore >= 15 ? theme.dangerLight : theme.white, transition: 'background 0.2s' }}>
                              <td style={{ padding: '16px 24px' }}>
                                <div style={{ fontWeight: '600', color: theme.textDark }}>{patient.firstName}</div>
                                <div style={{ fontSize: '0.8rem', color: theme.textMuted, marginTop: '2px' }}>Enrolled: {patient.enrolledAt ? new Date(patient.enrolledAt).toLocaleDateString() : 'N/A'}</div>
                              </td>
                              <td style={{ padding: '16px 24px', color: theme.textDark, fontSize: '0.9rem' }}>{patient.phoneNumber}</td>
                              <td style={{ padding: '16px 24px' }}>
                                <div style={{ fontWeight: '500', color: theme.textDark, fontSize: '0.95rem' }}>{patient.medication}</div>
                                <div style={{ fontSize: '0.8rem', color: theme.textMuted, marginTop: '2px' }}>{dose}x daily · <span style={{fontWeight: '600', color: theme.darkGreen}}>{currentPills} pills</span></div>
                              </td>
                              <td style={{ padding: '16px 24px' }}>
                                <div style={{ fontWeight: '600', fontSize: '0.95rem', color: isOut ? theme.danger : needsRefill ? theme.warning : theme.textDark }}>
                                  {isOut ? 'Depleted' : depletionDate.toLocaleDateString()}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: isOut ? theme.danger : needsRefill ? theme.warning : theme.textMuted, marginTop: '2px' }}>
                                  {isOut ? 'Action Required' : needsRefill ? 'Refill Soon' : 'Stable'}
                                </div>
                              </td>
                              <td style={{ padding: '16px 24px' }}>
                                <div style={{ 
                                  padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', display: 'inline-block', fontWeight: '600', letterSpacing: '0.3px', textTransform: 'uppercase',
                                  backgroundColor: patient.riskScore >= 15 ? theme.danger : theme.lightGreen,
                                  color: patient.riskScore >= 15 ? theme.white : theme.darkGreen,
                                }}>
                                  {patient.riskScore >= 15 ? `High Risk (${patient.riskScore})` : `Adherent (${patient.riskScore})`}
                                </div>
                              </td>
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

        {/* VIEW: ANALYTICS */}
        {currentPage === 'analytics' && (
           <div className="fade-in">
             <h2 style={{ color: theme.textDark, margin: '0 0 4px 0', fontSize: '1.75rem', fontWeight: '700' }}>System Analytics</h2>
             <p style={{ color: theme.textMuted, marginBottom: '24px' }}>Comprehensive overview of clinic adherence rates and system performance.</p>
             <div style={{ ...cardStyle, padding: '60px', textAlign: 'center', border: `1px dashed ${theme.primaryGreen}` }}>
               <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📈</div>
               <h3 style={{ color: theme.darkGreen, margin: '0 0 8px 0' }}>Analytics Module Ready</h3>
               <p style={{ color: theme.textMuted, maxWidth: '400px', margin: '0 auto' }}>Ready to integrate data visualization.</p>
             </div>
           </div>
        )}

        {/* VIEW: SETTINGS */}
        {currentPage === 'settings' && (
           <div className="fade-in">
             <h2 style={{ color: theme.textDark, margin: '0 0 4px 0', fontSize: '1.75rem', fontWeight: '700' }}>Configuration</h2>
             <p style={{ color: theme.textMuted, marginBottom: '24px' }}>Manage clinic details, SMS templates, and administrative access.</p>
             <div style={{ ...cardStyle, padding: '60px', textAlign: 'center' }}>
               <h3 style={{ color: theme.textDark, margin: '0 0 8px 0' }}>System Settings</h3>
               <p style={{ color: theme.textMuted }}>Administrative controls will be populated here.</p>
             </div>
           </div>
        )}

      </div>
    </div>
  );
}

// --- REUSABLE STYLES ---
const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '10px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
  border: '1px solid #e2e8f0',
  padding: '24px'
};

const labelStyle = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: '600',
  color: '#475569',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.3px'
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#f8fafc',
  fontSize: '0.95rem',
  color: '#0f172a',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s, box-shadow 0.2s'
};

export default App;