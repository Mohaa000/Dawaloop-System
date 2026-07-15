import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { CheckCircle2 } from 'lucide-react';
import { db } from '../firebase';
import useCurrentPatient from '../hooks/useCurrentPatient';
import { useToast } from '../context/ToastContext';
import LoadingScreen from '../components/LoadingScreen';
import { Card, Button } from '../components/ui';

const SECRET_KEY = import.meta.env.VITE_AES_SECRET_KEY;
const encryptData = (text) => CryptoJS.AES.encrypt(text, SECRET_KEY).toString();

export default function ProfileSettings() {
  const { patient, isLoading } = useCurrentPatient();

  if (isLoading) return <LoadingScreen message="Loading your profile..." />;
  if (!patient) return <div className="text-sm text-text-muted">No patient record linked to this login yet.</div>;

  // Keyed by patient.id so the form's local edit state initializes fresh from
  // the loaded record instead of syncing via a setState-in-effect.
  return <ProfileForm key={patient.id} patient={patient} />;
}

function ProfileForm({ patient }) {
  const { showToast } = useToast();
  const [name, setName] = useState(patient.firstName);
  const [phone, setPhone] = useState(patient.phoneNumber);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'patients', patient.id), {
        firstName: encryptData(name),
        phoneNumber: encryptData(phone)
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      console.error('Error updating profile', error);
      showToast('Failed to update profile.', { type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-[500px]">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Profile & Settings</h1>
        <p className="mt-1 text-sm text-text-muted">Update your personal information — re-encrypted on save.</p>
      </header>

      <Card className="fade-in">
        {saved && (
          <div className="mb-4 flex items-center gap-2 rounded-control bg-success-light p-3 text-sm font-semibold text-success">
            <CheckCircle2 size={16} /> Profile updated securely.
          </div>
        )}
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-text-muted">Legal Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-text-muted">Mobile Number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-text-muted">Login Email</label>
            <input value={patient.email || ''} disabled className={`${inputClass} cursor-not-allowed opacity-60`} />
          </div>
          <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save Changes'}</Button>
        </form>
      </Card>
    </div>
  );
}

const inputClass = 'w-full rounded-control border border-border bg-bg-base px-3 py-2.5 text-sm outline-none focus:border-primary';
