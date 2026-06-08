import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy } from 'firebase/firestore';
// IMPORTANT: Make sure this path correctly points to your firebase configuration file!
import { db } from './firebase'; 

function App() {
  // 1. STATE VARIABLES
  // This holds the list of patients downloaded from the database
  const [patients, setPatients] = useState([]);
  const [pillsDispensed, setPillsDispensed] = useState('');
const [pillsPerDay, setPillsPerDay] = useState('');
  // These hold the temporary text typed into the "Add Patient" form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newMedication, setNewMedication] = useState('');

  // 2. REAL-TIME DATABASE LISTENER
  useEffect(() => {
    // We query the 'patients' collection and sort them so high-risk patients jump to the top
    const patientsRef = collection(db, 'patients');
    const q = query(patientsRef, orderBy('riskScore', 'desc'));

    // onSnapshot listens for any changes (like your webhook updating a score)
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const patientData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPatients(patientData);
    });

    // Cleanup the listener when the component closes
    return () => unsubscribe();
  }, []);

  // 3. FORM SUBMIT FUNCTION
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
      pillsRemaining: parseInt(pillsDispensed) || 30, // Default to 30 if blank
      pillsPerDay: parseInt(pillsPerDay) || 1,        // Default to 1 if blank
      riskScore: 0,
      status: 'Active',
      enrolledAt: new Date().toISOString()
    });

      // Clear the form fields after successful upload
      setNewName('');
      setNewPhone('');
      setNewMedication('');
      setPillsDispensed('');
      setPillsPerDay('');
      
    } catch (error) {
      console.error("Error adding patient: ", error);
    }
  };

  // 4. THE UI DASHBOARD
  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ color: '#2c3e50', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
        DawaLoop Triage Dashboard
      </h1>

      {/* --- ADD PATIENT FORM --- */}
      <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #ddd' }}>
        <h3 style={{ marginTop: '0', color: '#333' }}>Register New Patient</h3>
        <form onSubmit={handleAddPatient} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="Patient Name" 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)} 
            required
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', flex: 1 }}
          />
          <input 
            type="text" 
            placeholder="Phone (e.g. +2547...)" 
            value={newPhone} 
            onChange={(e) => setNewPhone(e.target.value)} 
            required
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', flex: 1 }}
          />
          <input 
            type="text" 
            placeholder="Medication" 
            value={newMedication} 
            onChange={(e) => setNewMedication(e.target.value)} 
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', flex: 1 }}
          />
          <button 
            type="submit" 
            style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            + Add Patient
          </button>
        </form>
      </div>

      {/* --- PATIENT TABLE --- */}
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ backgroundColor: '#2c3e50', color: 'white', textAlign: 'left' }}>
            <th style={{ padding: '12px' }}>Name</th>
            <th style={{ padding: '12px' }}>Phone</th>
            <th style={{ padding: '12px' }}>Medication</th>
            <th style={{ padding: '12px' }}>Risk Score</th>
            <th style={{ padding: '12px' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {patients.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No patients found. Add one above!</td>
            </tr>
          ) : (
            patients.map((patient) => (
              <tr 
                key={patient.id} 
                // Dynamically change row color if risk score spikes (e.g., above 15)
                style={{ 
                  borderBottom: '1px solid #eee',
                  backgroundColor: patient.riskScore >= 15 ? '#ffebee' : 'white' 
                }}
              >
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{patient.firstName}</td>
                <td style={{ padding: '12px' }}>{patient.phoneNumber}</td>
                <td style={{ padding: '12px' }}>{patient.medication}</td>
                <td style={{ padding: '12px', color: patient.riskScore >= 15 ? '#d32f2f' : '#2e7d32', fontWeight: 'bold' }}>
                  {patient.riskScore}
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '12px', 
                    fontSize: '0.85em',
                    backgroundColor: patient.riskScore >= 15 ? '#ef5350' : '#4caf50',
                    color: 'white'
                  }}>
                    {patient.riskScore >= 15 ? 'High Risk' : 'Adherent'}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;