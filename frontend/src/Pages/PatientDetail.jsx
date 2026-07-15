import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, collection, query, orderBy, limit, updateDoc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { ArrowLeft, Check, StickyNote, History, Archive, ArchiveRestore } from 'lucide-react';
import { db } from '../firebase';
import { approveRefill, archivePatient, reactivatePatient } from '../lib/patientActions';
import { useToast } from '../context/ToastContext';
import { Card, Badge, Button, EmptyState, PromptModal, ConfirmModal } from '../components/ui';
import LoadingScreen from '../components/LoadingScreen';

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

export default function PatientDetail() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [patient, setPatient] = useState(null);
  const [doseLogs, setDoseLogs] = useState([]);
  const [refillRequests, setRefillRequests] = useState([]);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'patients', patientId), (snap) => {
      if (!snap.exists()) return setPatient(null);
      const raw = snap.data();
      setPatient({
        id: snap.id,
        ...raw,
        firstName: raw.firstName ? decryptData(raw.firstName) : 'Unknown',
        phoneNumber: raw.phoneNumber ? decryptData(raw.phoneNumber) : 'Unknown',
        shiftNote: raw.shiftNote ? decryptData(raw.shiftNote) : ''
      });
    });
    return () => unsubscribe();
  }, [patientId]);

  useEffect(() => {
    const q = query(collection(db, 'patients', patientId, 'doseLogs'), orderBy('timestamp', 'desc'), limit(30));
    const unsubscribe = onSnapshot(q, (snap) => setDoseLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsubscribe();
  }, [patientId]);

  useEffect(() => {
    const q = query(collection(db, 'patients', patientId, 'refillRequests'), orderBy('requestedAt', 'desc'), limit(30));
    const unsubscribe = onSnapshot(q, (snap) => setRefillRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsubscribe();
  }, [patientId]);

  const handleAddNote = async (noteText) => {
    try {
      await updateDoc(doc(db, 'patients', patientId), { shiftNote: encryptData(noteText) });
      showToast('Clinical note saved.', { type: 'success' });
    } catch (error) {
      showToast('Failed to save note.', { type: 'error' });
      throw error;
    }
  };

  const handleApproveRefill = async () => {
    if (!patient) return;
    try {
      await approveRefill(patient, 30);
      showToast('Refill approved.', { type: 'success' });
    } catch {
      showToast('Failed to approve refill.', { type: 'error' });
    }
  };

  const handleArchive = async () => {
    try {
      await archivePatient(patient);
      showToast(`${patient.firstName} has been archived.`, { type: 'success' });
    } catch (error) {
      showToast('Failed to archive patient.', { type: 'error' });
      throw error;
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivatePatient(patient);
      showToast(`${patient.firstName} has been reactivated.`, { type: 'success' });
    } catch {
      showToast('Failed to reactivate patient.', { type: 'error' });
    }
  };

  if (patient === null) return <LoadingScreen message="Loading patient record..." />;

  const timeline = [
    ...doseLogs.map((l) => ({
      id: `dose-${l.id}`,
      date: l.timestamp?.toDate?.(),
      label: l.status === 'taken' ? 'Dose taken' : 'Dose missed',
      tone: l.status === 'taken' ? 'success' : 'danger',
      source: l.source
    })),
    ...refillRequests.map((r) => ({
      id: `refill-${r.id}`,
      date: (r.status === 'approved' ? r.approvedAt : r.requestedAt)?.toDate?.(),
      label: r.status === 'approved' ? 'Refill approved' : 'Refill requested',
      tone: r.status === 'approved' ? 'success' : 'warning',
      source: 'portal'
    }))
  ]
    .filter((item) => item.date)
    .sort((a, b) => b.date - a.date);

  const isHighRisk = patient.riskScore >= 15;
  const isRefillRequested = patient.status === 'Refill Requested';
  const dose = patient.pillsPerDay || 1;
  const daysLeft = Math.floor((patient.pillsRemaining ?? 0) / dose);

  return (
    <div>
      <button onClick={() => navigate('/admin')} className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-primary">
        <ArrowLeft size={16} /> Back to Triage Queue
      </button>

      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{patient.firstName}</h1>
          <p className="mt-1 text-sm text-text-muted">{patient.phoneNumber} · {patient.medication}</p>
        </div>
        <div className="flex items-center gap-2">
          {patient.archived && <Badge tone="neutral">Archived</Badge>}
          <Badge tone={isHighRisk ? 'danger' : 'success'}>
            {isHighRisk ? `High Risk (${patient.riskScore})` : `Adherent (${patient.riskScore})`}
          </Badge>
        </div>
      </header>

      <div className="fade-in grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-6">
          <Card>
            <h3 className="mb-4 font-semibold">Regimen & Inventory</h3>
            <div className="flex flex-col gap-2 text-sm">
              <Row label="Daily dose" value={`${dose} pill(s)`} />
              <Row label="Pills remaining" value={`${patient.pillsRemaining ?? 0} (${daysLeft}d left)`} />
              <Row label="Status" value={patient.status} />
              <Row label="Enrolled" value={patient.enrolledAt ? new Date(patient.enrolledAt).toLocaleDateString() : 'N/A'} />
              <Row label="Login linked" value={patient.authUid ? patient.email : 'Not linked'} />
            </div>
            <div className="mt-5 flex flex-col gap-2">
              {patient.archived ? (
                <Button onClick={handleReactivate}><ArchiveRestore size={16} /> Reactivate Patient</Button>
              ) : (
                <>
                  {isRefillRequested && <Button onClick={handleApproveRefill}><Check size={16} /> Approve Refill</Button>}
                  <Button variant="outline" onClick={() => setIsNoteOpen(true)}><StickyNote size={16} /> Add Clinical Note</Button>
                  <Button variant="danger" onClick={() => setIsArchiveOpen(true)}><Archive size={16} /> Archive Patient</Button>
                </>
              )}
            </div>
          </Card>

          {patient.shiftNote && (
            <Card>
              <h3 className="mb-2 font-semibold">Latest Clinical Note</h3>
              <div className="rounded-control border-l-2 border-warning bg-bg-base px-3 py-2 text-sm">&quot;{patient.shiftNote}&quot;</div>
            </Card>
          )}
        </div>

        <Card padded={false}>
          <div className="border-b border-border p-5">
            <h3 className="font-semibold">Activity Timeline</h3>
          </div>
          <div className="flex max-h-[500px] flex-col gap-3 overflow-y-auto p-6">
            {timeline.length === 0 ? (
              <EmptyState icon={History} title="No recorded activity yet" description="Dose events and refill requests will appear here." />
            ) : (
              timeline.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b border-border pb-3 text-sm last:border-0">
                  <div>
                    <Badge tone={item.tone === 'success' ? 'success' : item.tone === 'warning' ? 'warning' : 'danger'}>{item.label}</Badge>
                    <span className="ml-2 text-xs uppercase text-text-muted">{item.source}</span>
                  </div>
                  <span className="text-text-muted">{item.date.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <PromptModal
        isOpen={isNoteOpen}
        onClose={() => setIsNoteOpen(false)}
        title={`Clinical note for ${patient.firstName}`}
        label="Secure note for next shift"
        placeholder="e.g. Patient reported mild nausea after dose"
        multiline
        submitLabel="Save Note"
        onSubmit={handleAddNote}
      />

      <ConfirmModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        title={`Archive ${patient.firstName}?`}
        description="They'll be removed from active monitoring and stop receiving SMS reminders. If they have a login, it will be disabled. Their history is kept and this can be undone later from the Triage Queue's Archived tab."
        confirmLabel="Archive Patient"
        tone="danger"
        onConfirm={handleArchive}
      />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
