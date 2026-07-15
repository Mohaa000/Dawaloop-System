import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import { Lock, Download, Check, StickyNote, Link2, Users, X, Archive, ArchiveRestore } from 'lucide-react';
import { db } from '../firebase';
import { createAccount, sendAccountSetupEmail } from '../lib/api';
import { approveRefill, archivePatient, reactivatePatient } from '../lib/patientActions';
import { useToast } from '../context/ToastContext';
import { Card, Badge, Button, StatTile, Table, Thead, Th, Td, Tr, EmptyState, PromptModal, ConfirmModal } from '../components/ui';

const SECRET_KEY = import.meta.env.VITE_AES_SECRET_KEY;

const encryptData = (text) => CryptoJS.AES.encrypt(text, SECRET_KEY).toString();

const decryptData = (cipherText) => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || cipherText;
  } catch {
    return cipherText;
  }
};

export default function AdminDashboard() {
  const [patients, setPatients] = useState([]);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [pillsDispensed, setPillsDispensed] = useState('');
  const [pillsPerDay, setPillsPerDay] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState('');
  const [setupBanner, setSetupBanner] = useState(null);
  const [notePatient, setNotePatient] = useState(null);
  const [linkLoginPatient, setLinkLoginPatient] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [queueTab, setQueueTab] = useState('Active');

  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    const patientsRef = collection(db, 'patients');
    const unsubscribe = onSnapshot(patientsRef, (snapshot) => {
      const patientData = snapshot.docs.map((doc) => {
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
  }, []);

  // 1. ENROLL PATIENT — creates a real login account, then the Firestore record
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

  // LINK LOGIN — backfills a login account onto a pre-existing patient record
  const handleLinkLogin = async (email) => {
    try {
      const { uid } = await createAccount({ email, name: linkLoginPatient.firstName, role: 'patient' });
      await updateDoc(doc(db, 'patients', linkLoginPatient.id), { authUid: uid, email });
      await sendAccountSetupEmail(email);
      setSetupBanner({ name: linkLoginPatient.firstName, email });
    } catch (error) {
      console.error('Error linking login', error);
      showToast(error.message || 'Failed to link login.', { type: 'error' });
      throw error;
    }
  };

  // 2. CLINICAL SHIFT NOTES
  const handleAddNote = async (noteText) => {
    try {
      await updateDoc(doc(db, 'patients', notePatient.id), { shiftNote: encryptData(noteText) });
      showToast('Clinical note saved.', { type: 'success' });
    } catch (error) {
      console.error('Error saving note', error);
      showToast('Failed to save note.', { type: 'error' });
      throw error;
    }
  };

  // 3. REFILL INBOX APPROVAL
  const handleApproveRefill = async (patient) => {
    try {
      await approveRefill(patient, 30);
      showToast(`Refill approved for ${patient.firstName}.`, { type: 'success' });
    } catch (error) {
      console.error('Error approving refill', error);
      showToast('Failed to approve refill.', { type: 'error' });
    }
  };

  // 5. ARCHIVE / REACTIVATE — reversible removal from active monitoring
  const handleArchive = async () => {
    try {
      await archivePatient(archiveTarget);
      showToast(`${archiveTarget.firstName} has been archived.`, { type: 'success' });
    } catch (error) {
      console.error('Error archiving patient', error);
      showToast('Failed to archive patient.', { type: 'error' });
      throw error;
    }
  };

  const handleReactivate = async (patient) => {
    try {
      await reactivatePatient(patient);
      showToast(`${patient.firstName} has been reactivated.`, { type: 'success' });
    } catch (error) {
      console.error('Error reactivating patient', error);
      showToast('Failed to reactivate patient.', { type: 'error' });
    }
  };

  // 4. EXPORT TO CSV ENGINE
  const downloadCSV = () => {
    const headers = 'Patient Name,Phone Number,Medication,Pills Remaining,Status,Latest Clinical Note\n';
    const csvRows = patients.map((p) => {
      const safeName = `"${p.firstName}"`;
      const safePhone = `"${p.phoneNumber}"`;
      const safeMed = `"${p.medication}"`;
      const safeNote = `"${p.shiftNote || 'No notes'}"`;
      const status = p.archived ? 'Archived' : p.status;
      return `${safeName},${safePhone},${safeMed},${p.pillsRemaining},${status},${safeNote}`;
    });

    const blob = new Blob([headers + csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DawaCore_Encrypted_Export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const activePatients = patients.filter((p) => !p.archived);
  const archivedPatients = patients.filter((p) => p.archived);
  const visiblePatients = queueTab === 'Active' ? activePatients : archivedPatients;

  const totalPatients = activePatients.length;
  const highRiskCount = activePatients.filter((p) => p.riskScore >= 15).length;
  const adherentCount = totalPatients - highRiskCount;

  return (
    <div>
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Triage Command Center</h1>
          <p className="mt-1 text-sm text-text-muted">Real-time adherence monitoring with AES-256 data encryption.</p>
        </div>
        <Button variant="outline" onClick={downloadCSV}><Download size={16} /> Export CSV Report</Button>
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

        <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <StatTile label="Total Monitored Patients" value={totalPatients} accent="primary" valueColor="main" icon={Users} />
          <StatTile label="High Risk Alerts (≥15)" value={highRiskCount} accent="danger" />
          <StatTile label="Fully Adherent" value={adherentCount} accent="success" />
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <span className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary-dark">ACTION</span> Secure Patient Enrollment
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

          <Card padded={false}>
            <div className="flex items-center justify-between border-b border-border p-5">
              <h3 className="text-lg font-semibold">Live Triage Queue</h3>
              <div className="flex gap-1 rounded-full bg-bg-base p-1">
                {['Active', 'Archived'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setQueueTab(tab)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      queueTab === tab ? 'bg-surface text-primary-dark shadow-soft' : 'text-text-muted'
                    }`}
                  >
                    {tab} {tab === 'Active' ? `(${activePatients.length})` : `(${archivedPatients.length})`}
                  </button>
                ))}
              </div>
            </div>
            <Table>
              <Thead>
                <Th>Patient Profile</Th>
                <Th>Contact</Th>
                <Th>Regimen & Inventory</Th>
                <Th>Clinical Notes & Status</Th>
                <Th>Actions</Th>
              </Thead>
              <tbody>
                {visiblePatients.length === 0 ? (
                  <tr>
                    <td colSpan="5">
                      <EmptyState
                        icon={Users}
                        title={queueTab === 'Active' ? 'No active patients' : 'No archived patients'}
                        description={queueTab === 'Active' ? 'Enroll your first patient using the form above.' : 'Patients you archive will show up here.'}
                      />
                    </td>
                  </tr>
                ) : (
                  visiblePatients.map((patient) => {
                    const currentPills = patient.pillsRemaining !== undefined ? patient.pillsRemaining : 30;
                    const dose = patient.pillsPerDay || 1;
                    const daysLeft = Math.floor(currentPills / dose);
                    const isRefillRequested = patient.status === 'Refill Requested';
                    const isHighRisk = patient.riskScore >= 15;

                    return (
                      <Tr
                        key={patient.id}
                        onClick={() => navigate(`/admin/patients/${patient.id}`)}
                        className={`cursor-pointer hover:bg-bg-base ${isHighRisk ? 'bg-danger-light' : ''}`}
                      >
                        <Td>
                          <div className="font-semibold">{patient.firstName}</div>
                          <div className="mt-0.5 text-xs text-text-muted">
                            Enrolled: {patient.enrolledAt ? new Date(patient.enrolledAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </Td>
                        <Td>{patient.phoneNumber}</Td>
                        <Td>
                          <div className="font-medium">{patient.medication}</div>
                          <div className="mt-0.5 text-xs text-text-muted">
                            {dose}x daily · <span className="font-semibold text-success">{currentPills} pills</span> ({daysLeft}d left)
                          </div>
                        </Td>
                        <Td>
                          {patient.archived ? (
                            <div className="text-xs text-text-muted">
                              Archived {patient.archivedAt?.toDate?.().toLocaleDateString() || ''}
                            </div>
                          ) : (
                            <>
                              {patient.shiftNote && (
                                <div className="mb-1.5 rounded-control border-l-2 border-warning bg-bg-base px-2.5 py-1.5 text-sm">
                                  &quot;{patient.shiftNote}&quot;
                                </div>
                              )}
                              <Badge tone={isHighRisk ? 'danger' : 'success'}>
                                {isHighRisk ? `High Risk (${patient.riskScore})` : `Adherent (${patient.riskScore})`}
                              </Badge>
                            </>
                          )}
                        </Td>
                        <Td onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col gap-2">
                            {patient.archived ? (
                              <Button variant="outline" className="w-full justify-center" onClick={() => handleReactivate(patient)}>
                                <ArchiveRestore size={16} /> Reactivate
                              </Button>
                            ) : (
                              <>
                                {isRefillRequested ? (
                                  <Button variant="primary" className="w-full justify-center" onClick={() => handleApproveRefill(patient)}><Check size={16} /> Approve Refill</Button>
                                ) : (
                                  <Button variant="outline" className="w-full justify-center" onClick={() => setNotePatient(patient)}><StickyNote size={16} /> Add Note</Button>
                                )}
                                {!patient.authUid && (
                                  <Button variant="ghost" className="w-full justify-center border border-border" onClick={() => setLinkLoginPatient(patient)}><Link2 size={16} /> Link Login</Button>
                                )}
                                <Button variant="danger" className="w-full justify-center" onClick={() => setArchiveTarget(patient)}>
                                  <Archive size={16} /> Archive
                                </Button>
                              </>
                            )}
                          </div>
                        </Td>
                      </Tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </Card>
        </div>
      </div>

      <PromptModal
        isOpen={!!notePatient}
        onClose={() => setNotePatient(null)}
        title={`Clinical note for ${notePatient?.firstName || ''}`}
        label="Secure note for next shift"
        placeholder="e.g. Patient reported mild nausea after dose"
        multiline
        submitLabel="Save Note"
        onSubmit={handleAddNote}
      />

      <PromptModal
        isOpen={!!linkLoginPatient}
        onClose={() => setLinkLoginPatient(null)}
        title={`Link login for ${linkLoginPatient?.firstName || ''}`}
        label="Login email"
        placeholder="patient@example.com"
        type="email"
        submitLabel="Create Login"
        onSubmit={handleLinkLogin}
      />

      <ConfirmModal
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        title={`Archive ${archiveTarget?.firstName || ''}?`}
        description="They'll be removed from active monitoring and stop receiving SMS reminders. If they have a login, it will be disabled. Their history is kept and this can be undone later from the Archived tab."
        confirmLabel="Archive Patient"
        tone="danger"
        onConfirm={handleArchive}
      />
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
