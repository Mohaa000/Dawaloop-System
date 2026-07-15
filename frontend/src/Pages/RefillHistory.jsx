import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { RotateCcw } from 'lucide-react';
import { db } from '../firebase';
import useCurrentPatient from '../hooks/useCurrentPatient';
import { requestRefill } from '../lib/patientActions';
import { useToast } from '../context/ToastContext';
import LoadingScreen from '../components/LoadingScreen';
import { Card, Badge, Button, Table, Thead, Th, Td, Tr, EmptyState } from '../components/ui';

export default function RefillHistory() {
  const { patient, isLoading: isPatientLoading } = useCurrentPatient();
  const { showToast } = useToast();
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!patient) return;
    const q = query(collection(db, 'patients', patient.id, 'refillRequests'), orderBy('requestedAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snap) => setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsubscribe();
  }, [patient]);

  if (isPatientLoading) return <LoadingScreen message="Loading refill history..." />;
  if (!patient) return <div className="text-sm text-text-muted">No patient record linked to this login yet.</div>;

  const isRefillRequested = patient.status === 'Refill Requested';

  const handleRequestRefill = async () => {
    try {
      await requestRefill(patient);
      showToast('Refill requested — your clinic has been notified.', { type: 'success' });
    } catch {
      showToast('Failed to request refill. Please try again.', { type: 'error' });
    }
  };

  return (
    <div>
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Refill Requests</h1>
          <p className="mt-1 text-sm text-text-muted">Track the status of your medication refill requests.</p>
        </div>
        {!isRefillRequested && (
          <Button onClick={handleRequestRefill}><RotateCcw size={16} /> Request Refill</Button>
        )}
      </header>

      <div className="fade-in">
        <Card padded={false}>
          <Table>
            <Thead>
              <Th>Requested</Th>
              <Th>Status</Th>
              <Th>Approved</Th>
            </Thead>
            <tbody>
              {requests.length === 0 ? (
                <tr><td colSpan="3"><EmptyState icon={RotateCcw} title="No refill requests yet" description="Requesting a refill from your Daily Dose page will show up here." /></td></tr>
              ) : (
                requests.map((req) => (
                  <Tr key={req.id}>
                    <Td>{req.requestedAt?.toDate?.().toLocaleString() || '—'}</Td>
                    <Td><Badge tone={req.status === 'approved' ? 'success' : 'warning'}>{req.status}</Badge></Td>
                    <Td>{req.approvedAt?.toDate?.().toLocaleString() || '—'}</Td>
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
