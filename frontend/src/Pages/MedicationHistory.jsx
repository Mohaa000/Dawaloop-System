import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { ClipboardList } from 'lucide-react';
import { db } from '../firebase';
import useCurrentPatient from '../hooks/useCurrentPatient';
import LoadingScreen from '../components/LoadingScreen';
import { Card, Badge, Table, Thead, Th, Td, Tr, EmptyState } from '../components/ui';

export default function MedicationHistory() {
  const { patient, isLoading: isPatientLoading } = useCurrentPatient();
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!patient) return;
    const q = query(collection(db, 'patients', patient.id, 'doseLogs'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snap) => setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsubscribe();
  }, [patient]);

  if (isPatientLoading) return <LoadingScreen message="Loading medication history..." />;
  if (!patient) return <div className="text-sm text-text-muted">No patient record linked to this login yet.</div>;

  const takenCount = logs.filter((l) => l.status === 'taken').length;

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Full Medication History</h1>
        <p className="mt-1 text-sm text-text-muted">Every logged dose event for {patient.medication}.</p>
      </header>

      <div className="fade-in">
        <Card className="mb-6">
          <div className="text-sm text-text-muted">Showing the last {logs.length} recorded events · {takenCount} taken</div>
        </Card>

        <Card padded={false}>
          <Table>
            <Thead>
              <Th>Date & Time</Th>
              <Th>Outcome</Th>
              <Th>Source</Th>
            </Thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan="3"><EmptyState icon={ClipboardList} title="No dose events logged yet" description="Log a dose from the Daily Dose page to see it here." /></td></tr>
              ) : (
                logs.map((log) => (
                  <Tr key={log.id}>
                    <Td>{log.timestamp?.toDate?.().toLocaleString() || '—'}</Td>
                    <Td><Badge tone={log.status === 'taken' ? 'success' : 'danger'}>{log.status}</Badge></Td>
                    <Td className="uppercase text-text-muted">{log.source}</Td>
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
