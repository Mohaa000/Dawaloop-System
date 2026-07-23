import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { UserPlus, Archive, UserCog, History } from 'lucide-react';
import { db } from '../firebase';
import { Card, Badge, EmptyState } from '../components/ui';

const SECRET_KEY = import.meta.env.VITE_AES_SECRET_KEY;
const decryptData = (cipherText) => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || cipherText;
  } catch {
    return cipherText;
  }
};

const EVENT_META = {
  enrolled: { label: 'Patient Enrolled', tone: 'primary', icon: UserPlus },
  archived: { label: 'Patient Archived', tone: 'danger', icon: Archive },
  account_created: { label: 'Account Created', tone: 'neutral', icon: UserCog }
};

// Derived from real timestamps already on patients/staff docs — no separate
// audit-log collection to maintain, but it means this only covers events
// that leave a timestamp trace today (enroll, archive, staff creation).
export default function ActivityLog() {
  const [patients, setPatients] = useState([]);
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'patients'), (snap) => {
      setPatients(
        snap.docs.map((d) => {
          const raw = d.data();
          return { id: d.id, ...raw, firstName: raw.firstName ? decryptData(raw.firstName) : 'Unknown' };
        })
      );
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'staff'), (snap) => {
      setStaff(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  const events = [
    ...patients
      .filter((p) => p.enrolledAt)
      .map((p) => ({
        id: `enroll-${p.id}`,
        type: 'enrolled',
        date: new Date(p.enrolledAt),
        text: `${p.firstName} was enrolled as a patient`
      })),
    ...patients
      .filter((p) => p.archived && p.archivedAt?.toDate)
      .map((p) => ({
        id: `archive-${p.id}`,
        type: 'archived',
        date: p.archivedAt.toDate(),
        text: `${p.firstName} was archived`
      })),
    ...staff
      .filter((s) => s.createdAt?.toDate)
      .map((s) => ({
        id: `staff-${s.id}`,
        type: 'account_created',
        date: s.createdAt.toDate(),
        text: `${s.name} was added as ${s.role === 'admin' ? 'an admin' : 'a nurse'}`
      }))
  ].sort((a, b) => b.date - a.date);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Activity Log</h1>
        <p className="mt-1 text-sm text-text-muted">A running history of account and patient lifecycle events across the system.</p>
      </header>

      <Card padded={false} className="fade-in">
        <div className="flex max-h-[calc(100vh-220px)] flex-col gap-3 overflow-y-auto p-6">
          {events.length === 0 ? (
            <EmptyState icon={History} title="No activity yet" description="Enrollments, archives, and account changes will show up here." />
          ) : (
            events.map((event) => {
              const meta = EVENT_META[event.type];
              const Icon = meta.icon;
              return (
                <div key={event.id} className="flex items-center justify-between border-b border-border pb-3 text-sm last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge tone={meta.tone} icon={Icon}>{meta.label}</Badge>
                    <span className="text-text-main">{event.text}</span>
                  </div>
                  <span className="text-text-muted">{event.date.toLocaleString()}</span>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
