import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserPlus, Users, X } from 'lucide-react';
import { db } from '../firebase';
import { createAccount, sendAccountSetupEmail } from '../lib/api';
import { Card, Badge, Button, Table, Thead, Th, Td, Tr, EmptyState } from '../components/ui';

export default function StaffSettings() {
  const [staff, setStaff] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [setupBanner, setSetupBanner] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'staff'), (snap) => {
      setStaff(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!name || !email) return;
    setIsCreating(true);
    setError('');
    try {
      const { uid } = await createAccount({ email, name, role: 'staff' });
      await setDoc(doc(db, 'staff', uid), { uid, name, email, role: 'staff', createdAt: serverTimestamp() });
      await sendAccountSetupEmail(email);
      setSetupBanner({ name, email });
      setName(''); setEmail('');
    } catch (err) {
      setError(err.message || 'Failed to create staff account.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Staff & Settings</h1>
        <p className="mt-1 text-sm text-text-muted">Manage clinic staff accounts and access.</p>
      </header>

      <div className="fade-in flex flex-col gap-6">
        {setupBanner && (
          <div className="flex items-start justify-between rounded-card border border-primary-light bg-primary-light p-4">
            <div className="text-sm">
              <div className="font-semibold text-primary-dark">Staff login created for {setupBanner.name}</div>
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
          <h3 className="mb-4 font-semibold">Add Staff Member</h3>
          {error && <div className="mb-4 rounded-control bg-danger-light p-3 text-sm text-danger">{error}</div>}
          <form onSubmit={handleAddStaff} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase text-text-muted">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} placeholder="e.g. Nurse John" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase text-text-muted">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} placeholder="john@dawaloop.com" />
            </div>
            <Button type="submit" disabled={isCreating} className="h-[42px]">
              <UserPlus size={16} /> {isCreating ? 'Creating…' : 'Add Staff'}
            </Button>
          </form>
        </Card>

        <Card padded={false}>
          <div className="border-b border-border p-5">
            <h3 className="font-semibold">Staff Directory</h3>
          </div>
          <Table>
            <Thead>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Added</Th>
            </Thead>
            <tbody>
              {staff.length === 0 ? (
                <tr><td colSpan="4"><EmptyState icon={Users} title="No staff accounts yet" description="Add your first staff member using the form above." /></td></tr>
              ) : (
                staff.map((member) => (
                  <Tr key={member.id}>
                    <Td className="font-medium">{member.name}</Td>
                    <Td>{member.email}</Td>
                    <Td><Badge tone={member.role === 'admin' ? 'primary' : 'neutral'}>{member.role}</Badge></Td>
                    <Td>{member.createdAt?.toDate?.().toLocaleDateString() || '—'}</Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}

const inputClass = 'w-full rounded-control border border-border bg-bg-base px-3 py-2.5 text-sm outline-none focus:border-primary';
