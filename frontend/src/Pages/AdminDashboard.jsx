import { useState, useEffect } from 'react';
import { collection, collectionGroup, onSnapshot, doc, updateDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import { Download, Check, StickyNote, Link2, Users, X, Archive, ArchiveRestore } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { createAccount, sendAccountSetupEmail } from '../lib/api';
import { approveRefill, archivePatient, reactivatePatient } from '../lib/patientActions';
import { useToast } from '../context/ToastContext';
import { theme } from '../theme';
import { Card, Badge, Button, StatTile, Table, Thead, Th, Td, Tr, EmptyState, PromptModal, ConfirmModal } from '../components/ui';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';

const SECRET_KEY = import.meta.env.VITE_AES_SECRET_KEY;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const decryptData = (cipherText) => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || cipherText;
  } catch {
    return cipherText;
  }
};

const encryptData = (text) => CryptoJS.AES.encrypt(text, SECRET_KEY).toString();

export default function AdminDashboard() {
  const [patients, setPatients] = useState([]);
  const [doseLogs, setDoseLogs] = useState([]);
  const [setupBanner, setSetupBanner] = useState(null);
  const [notePatient, setNotePatient] = useState(null);
  const [linkLoginPatient, setLinkLoginPatient] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [queueTab, setQueueTab] = useState('Active');

  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { showToast } = useToast();
  const basePath = `/${userRole}`;

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

  useEffect(() => {
    const cutoff = Timestamp.fromDate(new Date(Date.now() - THIRTY_DAYS_MS));
    const q = query(collectionGroup(db, 'doseLogs'), where('timestamp', '>=', cutoff), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDoseLogs(snapshot.docs.map((d) => d.data()));
    });
    return () => unsubscribe();
  }, []);

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

  // CLINICAL SHIFT NOTES
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

  // REFILL INBOX APPROVAL
  const handleApproveRefill = async (patient) => {
    try {
      await approveRefill(patient, 30);
      showToast(`Refill approved for ${patient.firstName}.`, { type: 'success' });
    } catch (error) {
      console.error('Error approving refill', error);
      showToast('Failed to approve refill.', { type: 'error' });
    }
  };

  // ARCHIVE / REACTIVATE — reversible removal from active monitoring
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

  // EXPORT TO CSV ENGINE
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

  const riskChartData = [
    { name: 'Adherent', value: adherentCount > 0 ? adherentCount : 1, color: theme.success },
    { name: 'High Risk', value: highRiskCount > 0 ? highRiskCount : 0, color: theme.danger }
  ];

  const adherenceTrendData = last7Days().map(({ start, end, label }) => {
    const dayLogs = doseLogs.filter((l) => {
      const t = l.timestamp?.toDate?.();
      return t && t >= start && t < end;
    });
    const dayTaken = dayLogs.filter((l) => l.status === 'taken').length;
    return { day: label, rate: dayLogs.length ? Math.round((dayTaken / dayLogs.length) * 100) : 0 };
  });

  const medicationCounts = activePatients.reduce((acc, p) => {
    const med = p.medication || 'Unspecified';
    acc[med] = (acc[med] || 0) + 1;
    return acc;
  }, {});
  const medicationDemographics = Object.entries(medicationCounts)
    .map(([name, patientCount]) => ({ name, patients: patientCount }))
    .sort((a, b) => b.patients - a.patients)
    .slice(0, 6);

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
            </div>
            <button onClick={() => setSetupBanner(null)} className="text-text-muted hover:text-text-main"><X size={16} /></button>
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <StatTile label="Total Monitored Patients" value={totalPatients} accent="primary" valueColor="main" icon={Users} />
          <StatTile label="High Risk Alerts (≥15)" value={highRiskCount} accent="danger" />
          <StatTile label="Fully Adherent" value={adherentCount} accent="success" />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <Card>
            <h3 className="mb-6 text-lg font-semibold">7-Day System-Wide Adherence Trend</h3>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={adherenceTrendData}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={theme.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.border} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: theme.textMuted }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: theme.textMuted }} unit="%" />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="rate" stroke={theme.primary} strokeWidth={3} fillOpacity={1} fill="url(#colorRate)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <h3 className="mb-2 text-lg font-semibold">Live Risk Distribution</h3>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskChartData} innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value" stroke="none">
                    {riskChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card className="mb-6">
          <h3 className="mb-6 text-lg font-semibold">Top Medications</h3>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={medicationDemographics} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme.border} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: theme.textMuted }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: theme.textMuted, fontSize: '0.8rem' }} />
                <Tooltip cursor={{ fill: theme.surface }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }} />
                <Bar dataKey="patients" fill={theme.primary} radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
                      description={queueTab === 'Active' ? 'Enroll a patient from the Patient Enrollment page.' : 'Patients you archive will show up here.'}
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
                      onClick={() => navigate(`${basePath}/patients/${patient.id}`)}
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

function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - i);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    days.push({ start, end, label: start.toLocaleDateString('en-US', { weekday: 'short' }) });
  }
  return days;
}
