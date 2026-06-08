import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase'; 

function App() {
  const [patients, setPatients] = useState([]);
  
  // State variables for the "Add Patient" form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [pillsDispensed, setPillsDispensed] = useState(''); // NEW
  const [pillsPerDay, setPillsPerDay] = useState('');       // NEW

  // Real-time Database Listener
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

  // Form Submit Logic
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
        pillsRemaining: parseInt(pillsDispensed) || 30, // Algorithm Base
        pillsPerDay: parseInt(pillsPerDay) || 1,        // Algorithm Rate
        riskScore: 0,
        status: 'Active',
        enrolledAt: new Date().toISOString()
      });

      // Clear fields
      setNewName('');
      setNewPhone('');
      setNewMedication('');
      setPillsDispensed('');
      setPillsPerDay('');
      
    } catch (error) {
      console.error("Error adding patient: ", error);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#2c3e50', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
        DawaLoop Triage Dashboard
      </h1>

      {/* --- ADD PATIENT FORM --- */}
      <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #ddd' }}>
        <h3 style={{ marginTop: '0', color: '#333' }}>Register New Patient & Prescription</h3>
        <form onSubmit={handleAddPatient} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="Patient Name" 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)} 
            required
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', flex: 1, minWidth: '150px' }}
          />
          <input 
            type="text" 
            placeholder="Phone (e.g. +2547...)" 
            value={newPhone} 
            onChange={(e) => setNewPhone(e.target.value)} 
            required
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', flex: 1, minWidth: '150px' }}
          />
          <input 
            type="text" 
            placeholder="Medication Name" 
            value={newMedication} 
            onChange={(e) => setNewMedication(e.target.value)} 
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', flex: 1, minWidth: '150px' }}
          />
          <input 
            type="number" 
            placeholder="Total Pills Given" 
            value={pillsDispensed} 
            onChange={(e) => setPillsDispensed(e.target.value)} 
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '130px' }}
          />
          <input 
            type="number" 
            placeholder="Pills Per Day" 
            value={pillsPerDay} 
            onChange={(e) => setPillsPerDay(e.target.value)} 
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '120px' }}
          />
          <button 
            type="submit" 
            style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            + Register Patient
          </button>
        </form>
      </div>

      {/* --- PATIENT TABLE --- */}
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ backgroundColor: '#2c3e50', color: 'white', textAlign: 'left' }}>
            <th style={{ padding: '12px' }}>Patient Profile</th>
            <th style={{ padding: '12px' }}>Mobile Contact</th>
            <th style={{ padding: '12px' }}>Therapeutic Regimen</th>
            <th style={{ padding: '12px' }}>Refill Forecast</th>
            <th style={{ padding: '12px' }}>Risk Vector</th>
          </tr>
        </thead>
        <tbody>
          {patients.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No patients found. Add one above!</td>
            </tr>
          ) : (
            patients.map((patient) => {
              // --- FORECAST ALGORITHM MATH ---
              const currentPills = patient.pillsRemaining !== undefined ? patient.pillsRemaining : 30;
              const dose = patient.pillsPerDay || 1;
              const daysLeft = Math.floor(currentPills / dose);
              
              const depletionDate = new Date();
              depletionDate.setDate(depletionDate.getDate() + daysLeft);
              
              const needsRefill = daysLeft <= 5 && daysLeft > 0;
              const isOut = daysLeft <= 0;

              return (
                <tr 
                  key={patient.id} 
                  style={{ 
                    borderBottom: '1px solid #eee',
                    backgroundColor: patient.riskScore >= 15 ? '#ffebee' : 'white' 
                  }}
                >
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 'bold' }}>{patient.firstName}</div>
                    <div style={{ fontSize: '0.85em', color: '#666' }}>
                      Enrolled: {patient.enrolledAt ? new Date(patient.enrolledAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>{patient.phoneNumber}</td>
                  
                  {/* THERAPEUTIC REGIMEN */}
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 'bold' }}>{patient.medication}</div>
                    <div style={{ fontSize: '0.85em', color: '#666' }}>
                      {dose}x daily · {currentPills} pills left
                    </div>
                  </td>

                  {/* REFILL FORECAST ALGORITHM */}
                  <td style={{ padding: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: isOut ? '#d32f2f' : needsRefill ? '#f57c00' : '#333' }}>
                        {isOut ? 'Depleted' : depletionDate.toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '0.85em', color: isOut ? '#d32f2f' : needsRefill ? '#f57c00' : '#666' }}>
                        {isOut ? 'Immediate Action Required' : needsRefill ? '⚠️ Refill Required' : 'Calculated Depletion'}
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: '12px' }}>
                    <div style={{ 
                      padding: '4px 8px', 
                      borderRadius: '12px', 
                      fontSize: '0.9em',
                      display: 'inline-block',
                      backgroundColor: patient.riskScore >= 15 ? '#ef5350' : '#4caf50',
                      color: 'white',
                      fontWeight: 'bold'
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
  );
}

export default App;