import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import { db, auth } from '../firebase';
import { theme, layout } from '../theme';

// ENCRYPTION CONFIGURATION
const SECRET_KEY = "dawacore_secure_2026"; 

const encryptData = (text) => {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

const decryptData = (cipherText) => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || cipherText; 
  } catch (error) {
    return cipherText;
  }
};

export default function AdminDashboard({ user }) {
  const [patients, setPatients] = useState([]);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [pillsDispensed, setPillsDispensed] = useState('');
  const [pillsPerDay, setPillsPerDay] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();

  // DECRYPT ON LOAD
  useEffect(() => {
    if (!user) return;
    const patientsRef = collection(db, 'patients');
    const unsubscribe = onSnapshot(patientsRef, (snapshot) => {
      const patientData = snapshot.docs.map(doc => {
        const rawData = doc.data();
        return {
          id: doc.id,
          ...rawData,
          firstName: rawData.firstName ? decryptData(rawData.firstName) : 'Unknown',
          phoneNumber: rawData.phoneNumber ? decryptData(rawData.phoneNumber) : 'Unknown',
          shiftNote: rawData.shiftNote ? decryptData(rawData.shiftNote) : ''
        };
      });
      patientData.sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));
      setPatients(patientData);
    });
    return () => unsubscribe();
  }, [user]);

  // 1. ENROLL PATIENT
  const handleAddPatient = async (e) => {
    e.preventDefault();
    if (!newName || !newPhone) return;
    try {
      const rawPhone = newPhone.startsWith('+') ? newPhone : `+${newPhone}`;
      await addDoc(collection(db, 'patients'), {
        firstName: encryptData(newName),
        phoneNumber: encryptData(rawPhone),
        medication: newMedication || 'General',
        pillsRemaining: parseInt(pillsDispensed) || 30,
        pillsPerDay: parseInt(pillsPerDay) || 1,
        riskScore: 0,
        status: 'Active',
        shiftNote: '',
        enrolledAt: new Date().toISOString()
      });
      setNewName(''); setNewPhone(''); setNewMedication(''); setPillsDispensed(''); setPillsPerDay('');
    } catch (error) {
      console.error("Error adding patient: ", error);
    }
  };

  // 2. CLINICAL SHIFT NOTES
  const handleAddNote = async (patientId) => {
    const noteText = window.prompt("Enter secure clinical note for next shift:");
    if (!noteText) return;
    try {
      const patientRef = doc(db, 'patients', patientId);
      // Encrypt the note before it hits Firebase
      await updateDoc(patientRef, { shiftNote: encryptData(noteText) });
    } catch (error) {
      console.error("Error saving note", error);
    }
  };

  // 3. REFILL INBOX APPROVAL
  const handleApproveRefill = async (patientId, defaultPills) => {
    try {
      const patientRef = doc(db, 'patients', patientId);
      await updateDoc(patientRef, { pillsRemaining: defaultPills || 30, status: 'Active' });
    } catch (error) {
      console.error("Error approving refill", error);
    }
  };

  // 4. EXPORT TO CSV ENGINE
  const downloadCSV = () => {
    const headers = "Patient Name,Phone Number,Medication,Pills Remaining,Status,Latest Clinical Note\n";
    const csvRows = patients.map(p => {
      // Escape commas in notes or names so it doesn't break the spreadsheet columns
      const safeName = `"${p.firstName}"`;
      const safePhone = `"${p.phoneNumber}"`;
      const safeMed = `"${p.medication}"`;
      const safeNote = `"${p.shiftNote || 'No notes'}"`;
      return `${safeName},${safePhone},${safeMed},${p.pillsRemaining},${p.status},${safeNote}`;
    });
    
    const blob = new Blob([headers + csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DawaCore_Encrypted_Export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalPatients = patients.length;
  const highRiskCount = patients.filter(p => p.riskScore >= 15).length;
  const adherentCount = totalPatients - highRiskCount;

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
            <button onClick={() => navigate('/admin')} style={navButtonStyle(location.pathname === '/admin', theme)}>📊 Clinical Command</button>
            <button onClick={() => navigate('/admin/analytics')} style={navButtonStyle(location.pathname === '/admin/analytics', theme)}>📈 System Analytics</button>
          </nav>
        </div>
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '16px' }}>
          <button onClick={() => signOut(auth)} style={logoutButtonStyle(theme)}>🚪 Secure Logout</button>
        </div>
      </aside>

      {/* WORKSPACE */}
      <main style={{ marginLeft: '260px', flexGrow: 1, padding: '40px', boxSizing: 'border-box' }}>
        
        {/* HEADER WITH CSV BUTTON */}
        <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '700', margin: 0, color: theme.textMain }}>Triage Command Center</h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.95rem', color: theme.textMuted }}>Real-time adherence monitoring with AES-256 data encryption.</p>
          </div>
          <button onClick={downloadCSV} style={{ padding: '10px 20px', backgroundColor: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '8px', fontWeight: '600', color: theme.textMain, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: layout.cardShadow }}>
            📥 Export CSV Report
          </button>
        </header>

        <div className="fade-in">
          {/* TOP METRICS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div style={{ ...cardStyle, borderLeft: `4px solid ${theme.primary}` }}><div style={metricLabelStyle}>Total Monitored Patients</div><div style={metricValueStyle(theme.textMain)}>{totalPatients}</div></div>
            <div style={{ ...cardStyle, borderLeft: `4px solid ${theme.danger}` }}><div style={metricLabelStyle}>High Risk Alerts (≥15)</div><div style={metricValueStyle(theme.danger)}>{highRiskCount}</div></div>
            <div style={{ ...cardStyle, borderLeft: `4px solid ${theme.success}` }}><div style={metricLabelStyle}>Fully Adherent</div><div style={metricValueStyle(theme.success)}>{adherentCount}</div></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
            {/* Registration Form */}
            <div style={{ ...cardStyle, padding: '24px' }}>
              <h3 style={{ marginTop: '0', color: theme.textMain, fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ backgroundColor: theme.primaryLight, color: theme.primary, padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>ACTION</span> Secure Patient Enrollment</h3>
              <form onSubmit={handleAddPatient} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'end' }}>
                <div><label style={labelStyle}>Patient Name</label><input type="text" placeholder="e.g. Jane Doe" value={newName} onChange={(e) => setNewName(e.target.value)} required style={inputStyle} /></div>
                <div><label style={labelStyle}>Mobile Number</label><input type="text" placeholder="+254..." value={newPhone} onChange={(e) => setNewPhone(e.target.value)} required style={inputStyle} /></div>
                <div><label style={labelStyle}>Medication</label><input type="text" placeholder="e.g. Metformin" value={newMedication} onChange={(e) => setNewMedication(e.target.value)} style={inputStyle} /></div>
                <div style={{ display: 'flex', gap: '12px' }}><div style={{ flex: 1 }}><label style={labelStyle}>Total Pills</label><input type="number" placeholder="30" value={pillsDispensed} onChange={(e) => setPillsDispensed(e.target.value)} style={inputStyle} /></div><div style={{ flex: 1 }}><label style={labelStyle}>Daily Dose</label><input type="number" placeholder="1" value={pillsPerDay} onChange={(e) => setPillsPerDay(e.target.value)} style={inputStyle} /></div></div>
                <button type="submit" style={{ padding: '10px 16px', height: '42px', backgroundColor: theme.primary, color: theme.surface, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                  <span>🔒</span> Encrypt & Enroll
                </button>
              </form>
            </div>

            {/* Triage Queue Table */}
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: `1px solid ${theme.border}`, backgroundColor: theme.surface }}><h3 style={{ margin: 0, color: theme.textMain, fontSize: '1.1rem' }}>Live Triage Queue</h3></div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ backgroundColor: theme.bgBase, color: theme.textMuted, textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase' }}><th style={thStyle}>Patient Profile</th><th style={thStyle}>Contact</th><th style={thStyle}>Regimen & Inventory</th><th style={thStyle}>Clinical Notes & Status</th><th style={thStyle}>Actions</th></tr></thead>
                  <tbody>
                    {patients.length === 0 ? (<tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: theme.textMuted }}>No active patients.</td></tr>) : (
                      patients.map((patient) => {
                        const currentPills = patient.pillsRemaining !== undefined ? patient.pillsRemaining : 30;
                        const dose = patient.pillsPerDay || 1;
                        const daysLeft = Math.floor(currentPills / dose);
                        const isRefillRequested = patient.status === 'Refill Requested';

                        return (
                          <tr key={patient.id} style={{ borderBottom: `1px solid ${theme.border}`, backgroundColor: patient.riskScore >= 15 ? theme.dangerLight : theme.surface }}>
                            <td style={tdStyle}><div style={{ fontWeight: '600', color: theme.textMain }}>{patient.firstName}</div><div style={subTextStyle}>Enrolled: {patient.enrolledAt ? new Date(patient.enrolledAt).toLocaleDateString() : 'N/A'}</div></td>
                            <td style={tdStyle}>{patient.phoneNumber}</td>
                            <td style={tdStyle}><div style={{ fontWeight: '500', color: theme.textMain }}>{patient.medication}</div><div style={subTextStyle}>{dose}x daily · <span style={{fontWeight: '600', color: theme.success}}>{currentPills} pills</span></div></td>
                            <td style={tdStyle}>
                              {/* DISPLAY ENCRYPTED NOTE IF ONE EXISTS */}
                              {patient.shiftNote && <div style={{ fontSize: '0.85rem', color: theme.textMain, marginBottom: '6px', backgroundColor: theme.bgBase, padding: '6px 10px', borderRadius: '4px', borderLeft: `2px solid ${theme.warning}` }}>"{patient.shiftNote}"</div>}
                              <div style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', display: 'inline-block', fontWeight: '600', textTransform: 'uppercase', backgroundColor: patient.riskScore >= 15 ? theme.danger : theme.successLight, color: patient.riskScore >= 15 ? theme.surface : theme.success }}>{patient.riskScore >= 15 ? `High Risk (${patient.riskScore})` : `Adherent (${patient.riskScore})`}</div>
                            </td>
                            <td style={tdStyle}>
                              <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                                {/* SHOW EITHER REFILL APPROVAL OR ADD NOTE BUTTON */}
                                {isRefillRequested ? (
                                  <button onClick={() => handleApproveRefill(patient.id, 30)} style={{ ...actionButtonStyle, backgroundColor: theme.primary, color: '#fff' }}>✓ Approve Refill</button>
                                ) : (
                                  <button onClick={() => handleAddNote(patient.id)} style={{ ...actionButtonStyle, backgroundColor: theme.bgBase, color: theme.textMain, border: `1px solid ${theme.border}` }}>+ Add Note</button>
                                )}
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
      </main>
    </div>
  );
}

// REUSABLE STYLES
const cardStyle = { backgroundColor: '#ffffff', borderRadius: '10px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', padding: '24px' };
const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.95rem', color: '#0f172a', outline: 'none', boxSizing: 'border-box' };
const thStyle = { padding: '12px 24px', fontWeight: '600' };
const tdStyle = { padding: '16px 24px', verticalAlign: 'top' };
const subTextStyle = { fontSize: '0.8rem', color: '#64748b', marginTop: '2px' };
const metricLabelStyle = { fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' };
const metricValueStyle = (color) => ({ fontSize: '2rem', fontWeight: '700', color: color, marginTop: '8px' });
const navButtonStyle = (isActive, theme) => ({ display: 'flex', alignItems: 'center', width: '100%', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', backgroundColor: isActive ? theme.primaryLight : 'transparent', color: isActive ? theme.primary : theme.textMuted, transition: 'all 0.2s', textAlign: 'left' });
const logoutButtonStyle = (theme) => ({ display: 'flex', alignItems: 'center', width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${theme.dangerLight}`, fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', backgroundColor: 'transparent', color: theme.danger, transition: 'all 0.2s', textAlign: 'left' });
const actionButtonStyle = { padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', width: '100%' };