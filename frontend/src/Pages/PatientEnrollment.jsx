import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { Lock, X } from 'lucide-react';
import { db } from '../firebase';
import { createAccount, sendAccountSetupEmail } from '../lib/api';
import { Card, Button } from '../components/ui';

const SECRET_KEY = import.meta.env.VITE_AES_SECRET_KEY;
const encryptData = (text) => CryptoJS.AES.encrypt(text, SECRET_KEY).toString();

export default function PatientEnrollment() {
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [pillsDispensed, setPillsDispensed] = useState('');
  const [pillsPerDay, setPillsPerDay] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState('');
  const [setupBanner, setSetupBanner] = useState(null);

  const handleAddPatient = async (e) => {
    e.preventDefault();
    if (!newName || !newPhone || !newEmail) return;
    setIsEnrolling(true);
    setEnrollError('');
    try {
      const rawPhone = newPhone.startsWith('+') ? newPhone : `+${newPhone}`;
      const { uid } = await createAccount({ email: newEmail, name: newName, role: 'patient' });

      await addDoc(collection(db, 'patients'), {
        firstName: encryptData(newName),
        phoneNumber: encryptData(rawPhone),
        medication: newMedication || 'General',
        pillsRemaining: parseInt(pillsDispensed) || 30,
        pillsPerDay: parseInt(pillsPerDay) || 1,
        riskScore: 0,
        status: 'Active',
        shiftNote: '',
        enrolledAt: new Date().toISOString(),
        authUid: uid,
        email: newEmail
      });

      await sendAccountSetupEmail(newEmail);
      setSetupBanner({ name: newName, email: newEmail });
      setNewName(''); setNewEmail(''); setNewPhone(''); setNewMedication(''); setPillsDispensed(''); setPillsPerDay('');
    } catch (error) {
      console.error('Error adding patient: ', error);
      setEnrollError(error.message || 'Failed to enroll patient.');
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Secure Patient Enrollment</h1>
        <p className="mt-1 text-sm text-text-muted">Enroll a new patient with AES-256 encrypted records and a self-service login.</p>
      </header>

      <div className="fade-in">
        {setupBanner && (
          <div className="mb-6 flex items-start justify-between rounded-card border border-primary-light bg-primary-light p-4">
            <div className="text-sm text-text-main">
              <div className="font-semibold text-primary-dark">Login created for {setupBanner.name}</div>
              <div className="mt-1">
                A password setup email was sent to <span className="font-mono">{setupBanner.email}</span> — they'll pick their own password.
              </div>
              <div className="mt-1 text-xs text-text-muted">
                It often lands in Spam/Junk on first send — let them know to check there if it doesn't show up within a few minutes.
              </div>
            </div>
            <button onClick={() => setSetupBanner(null)} className="text-text-muted hover:text-text-main"><X size={16} /></button>
          </div>
        )}

        <Card>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <span className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary-dark">ACTION</span> New Patient Details
          </h3>
          {enrollError && <div className="mb-4 rounded-control bg-danger-light p-3 text-sm text-danger">{enrollError}</div>}
          <form onSubmit={handleAddPatient} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Patient Name">
              <input type="text" placeholder="e.g. Jane Doe" value={newName} onChange={(e) => setNewName(e.target.value)} required className={inputClass} />
            </Field>
            <Field label="Login Email">
              <input type="email" placeholder="jane@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required className={inputClass} />
            </Field>
            <Field label="Mobile Number">
              <input type="text" placeholder="+254..." value={newPhone} onChange={(e) => setNewPhone(e.target.value)} required className={inputClass} />
            </Field>
            <Field label="Medication">
              <input type="text" placeholder="e.g. Metformin" value={newMedication} onChange={(e) => setNewMedication(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Total Pills">
              <input type="number" placeholder="30" value={pillsDispensed} onChange={(e) => setPillsDispensed(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Daily Dose">
              <input type="number" placeholder="1" value={pillsPerDay} onChange={(e) => setPillsPerDay(e.target.value)} className={inputClass} />
            </Field>
            <Button type="submit" disabled={isEnrolling} className="h-[42px] sm:col-span-2 lg:col-span-1">
              <Lock size={16} /> {isEnrolling ? 'Enrolling…' : 'Encrypt & Enroll'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase text-text-muted">{label}</label>
      {children}
    </div>
  );
}

const inputClass = 'w-full rounded-control border border-border bg-bg-base px-3 py-2.5 text-sm outline-none focus:border-primary';
