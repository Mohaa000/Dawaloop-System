import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('register'); // 'register' or 'triage'
  
  // Real-time Patients Array State
  const [patients, setPatients] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '+254',
    medicationName: '',
    dosageFrequency: '1',
    quantityDispensed: '',
    daysSupply: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // 🔄 REAL-TIME HIGH-CONCURRENCY LISTENER (Objective 3)
  // Pulls data live from Firestore and auto-sorts by highest Risk Score first
  useEffect(() => {
    const q = query(collection(db, 'patients'), orderBy('riskScore', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const patientList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Format timestamp for display safely
        registeredAtDate: doc.data().registeredAt?.toDate().toLocaleDateString() || 'N/A',
        refillDateStr: doc.data().currentRefillPrediction?.toDate().toLocaleDateString() || 'N/A'
      }));
      setPatients(patientList);
    }, (error) => {
      console.error("Real-time sync error: ", error);
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const today = new Date();
      const projectedRefillDate = new Date();
      projectedRefillDate.setDate(today.getDate() + parseInt(formData.daysSupply));

      // Generate a realistic initial risk score for demonstration (e.g., 0 for perfect start)
      // Later, missed SMS checks will algorithmically bump this score up
      await addDoc(collection(db, 'patients'), {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        medicationName: formData.medicationName,
        dosageFrequency: parseInt(formData.dosageFrequency),
        quantityDispensed: parseInt(formData.quantityDispensed),
        daysSupply: parseInt(formData.daysSupply),
        initialRefillDate: projectedRefillDate,
        currentRefillPrediction: projectedRefillDate,
        riskScore: Math.floor(Math.random() * 40), // Simulated baseline risk variation for visual testing
        status: 'Active',
        registeredAt: today,
      });

      setMessage({ type: 'success', text: 'Patient profile and medication schedule logged successfully!' });
      setFormData({
        firstName: '',
        lastName: '',
        phoneNumber: '+254',
        medicationName: '',
        dosageFrequency: '1',
        quantityDispensed: '',
        daysSupply: '',
      });
    } catch (error) {
      console.error("Error logging record: ", error);
      setMessage({ type: 'error', text: 'System failed to write record to clinical cloud storage.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased font-sans text-slate-800">
      {/* Header bar */}
      <header className="bg-slate-900 text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-wide">DawaLoop · Clinic Management</h1>
          
          {/* Navigation Tabs */}
          <div className="flex gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button 
              onClick={() => setActiveTab('register')}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === 'register' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}>
              Register & Dispense
            </button>
            <button 
              onClick={() => setActiveTab('triage')}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                activeTab === 'triage' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}>
              Triage Dashboard
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {patients.length}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
        
        {/* TAB 1: REGISTRATION FORM */}
        {activeTab === 'register' && (
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Patient Registration & Dispensing Log</h2>
              <p className="text-sm text-slate-500 mt-1">
                Input prescription variables here at the point of dispensing to initialize automated tracking mechanisms.
              </p>
            </div>

            {message.text && (
              <div className={`mb-6 p-4 rounded-lg border text-sm ${
                message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 tracking-wider uppercase mb-1.5">First Name</label>
                  <input required type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 tracking-wider uppercase mb-1.5">Last Name</label>
                  <input required type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 tracking-wider uppercase mb-1.5">Primary Mobile Number (SMS Target)</label>
                <input required type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 font-mono transition" />
              </div>

              <div className="border-t border-slate-100 pt-4 mt-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Prescription Variables</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 tracking-wider uppercase mb-1.5">Medication Name</label>
                    <input required type="text" name="medicationName" value={formData.medicationName} onChange={handleChange} placeholder="e.g., Metformin, ARV Regimen II"
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 tracking-wider uppercase mb-1.5">Frequency</label>
                      <select name="dosageFrequency" value={formData.dosageFrequency} onChange={handleChange}
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition">
                        <option value="1">Once Daily (1x)</option>
                        <option value="2">Twice Daily (2x)</option>
                        <option value="3">Three Times Daily (3x)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 tracking-wider uppercase mb-1.5">Qty Dispensed</label>
                      <input required type="number" min="1" name="quantityDispensed" value={formData.quantityDispensed} onChange={handleChange}
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 tracking-wider uppercase mb-1.5">Days Supply</label>
                      <input required type="number" min="1" name="daysSupply" value={formData.daysSupply} onChange={handleChange}
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition" />
                    </div>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 px-4 rounded-lg shadow transition duration-150 flex justify-center items-center gap-2 mt-6 disabled:opacity-50">
                {loading ? 'Committing to Cloud Record...' : 'Log Patient & Initialize Schedule'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: HIGH-CONCURRENCY TRIAGE DASHBOARD (Objective 3) */}
        {activeTab === 'triage' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4 gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Population Triage & Adherence Monitor</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Real-time synchronization matrix ranking active cases based on dynamic non-compliance tracking metrics.
                </p>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 shadow-sm">
                Active Cohort Capacity: <span className="font-bold text-slate-900 font-mono ml-1">{patients.length} records</span>
              </div>
            </div>

            {/* Patients Triage Table Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="p-4">Patient Profile</th>
                      <th className="p-4">Mobile Contact</th>
                      <th className="p-4">Therapeutic Regimen</th>
                      <th className="p-4">Refill Forecast</th>
                      <th className="p-4 text-center">Risk Vector</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {patients.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center p-8 text-slate-400 font-medium">
                          No active clinical profiles found. Use the registration module to initialize cohort entries[cite: 1].
                        </td>
                      </tr>
                    ) : (
                      patients.map((patient) => {
                        // Dynamic styling variables based on algorithmic risk scores
                        let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
                        let riskLabel = "Stable";
                        
                        if (patient.riskScore >= 25) {
                          badgeColor = "bg-rose-50 text-rose-700 border-rose-100 font-bold animate-pulse";
                          riskLabel = "High Risk";
                        } else if (patient.riskScore >= 12) {
                          badgeColor = "bg-amber-50 text-amber-700 border-amber-100 font-medium";
                          riskLabel = "Medium Risk";
                        } else {
                          badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100 font-medium";
                          riskLabel = "Adherent";
                        }

                        return (
                          <tr key={patient.id} className="hover:bg-slate-50/50 transition">
                            <td className="p-4">
                              <div className="font-semibold text-slate-900">{patient.firstName} {patient.lastName}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">Enrolled: {patient.registeredAtDate}</div>
                            </td>
                            <td className="p-4 font-mono text-xs text-slate-600">{patient.phoneNumber}</td>
                            <td className="p-4">
                              <div className="font-medium text-slate-700">{patient.medicationName}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{patient.dosageFrequency}x daily · {patient.daysSupply} Days Supply</div>
                            </td>
                            <td className="p-4">
                              <div className="font-medium text-slate-800">{patient.refillDateStr}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">Calculated Depletion</div>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border ${badgeColor}`}>
                                {riskLabel} ({patient.riskScore})
                              </span>
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
        )}
      </main>
    </div>
  );
}

export default App;