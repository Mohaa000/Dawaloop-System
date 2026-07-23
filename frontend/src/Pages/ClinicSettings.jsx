import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { CheckCircle2 } from 'lucide-react';
import { db } from '../firebase';
import { useToast } from '../context/ToastContext';
import { Card, Button } from '../components/ui';

const CLINIC_DOC = doc(db, 'settings', 'clinic');

const DEFAULTS = {
  name: 'DawaLoop Partner Clinic',
  phone: '+254 700 000 000',
  email: 'care@dawaloop.com',
  hours: 'Mon–Fri, 8:00 AM – 5:00 PM (Africa/Nairobi)'
};

export default function ClinicSettings() {
  const { showToast } = useToast();
  const [values, setValues] = useState(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(CLINIC_DOC, (snap) => {
      if (snap.exists()) setValues({ ...DEFAULTS, ...snap.data() });
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await setDoc(CLINIC_DOC, values, { merge: true });
      showToast('Clinic settings saved — patients will see the update immediately.', { type: 'success' });
    } catch (error) {
      console.error('Error saving clinic settings', error);
      showToast('Failed to save clinic settings.', { type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const field = (key) => ({
    value: values[key],
    onChange: (e) => setValues((v) => ({ ...v, [key]: e.target.value }))
  });

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Clinic Settings</h1>
        <p className="mt-1 text-sm text-text-muted">
          This information is shown to patients on their Support page.
        </p>
      </header>

      <Card className="fade-in max-w-xl">
        {isLoading ? (
          <div className="text-sm text-text-muted">Loading…</div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <Field label="Clinic Name">
              <input {...field('name')} required className={inputClass} />
            </Field>
            <Field label="Contact Phone">
              <input {...field('phone')} required className={inputClass} />
            </Field>
            <Field label="Contact Email">
              <input type="email" {...field('email')} required className={inputClass} />
            </Field>
            <Field label="Operating Hours">
              <input {...field('hours')} required className={inputClass} />
            </Field>
            <Button type="submit" disabled={isSaving} className="self-start">
              <CheckCircle2 size={16} /> {isSaving ? 'Saving…' : 'Save Changes'}
            </Button>
          </form>
        )}
      </Card>
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
