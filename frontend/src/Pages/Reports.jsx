import { useState, useEffect } from 'react';
import { collection, collectionGroup, onSnapshot, query, where, orderBy, Timestamp } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { Download, TrendingUp, Bell, RotateCcw } from 'lucide-react';
import { db } from '../firebase';
import { Card, Button, Table, Thead, Th, Td, Tr } from '../components/ui';

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

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function downloadCSV(filename, headers, rows) {
  const blob = new Blob([headers + rows.join('\n')], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export default function Reports() {
  const [patients, setPatients] = useState([]);
  const [doseLogs, setDoseLogs] = useState([]);
  const [refillRequests, setRefillRequests] = useState([]);
  const [alerts, setAlerts] = useState([]);

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
    const cutoff = Timestamp.fromDate(new Date(Date.now() - THIRTY_DAYS_MS));
    const q = query(collectionGroup(db, 'doseLogs'), where('timestamp', '>=', cutoff), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setDoseLogs(snap.docs.map((d) => ({ ...d.data(), patientId: d.ref.parent.parent.id })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // No orderBy here deliberately — a collection-group orderBy would need its
    // own index; this dataset is small enough to sort client-side instead.
    const unsubscribe = onSnapshot(collectionGroup(db, 'refillRequests'), (snap) => {
      setRefillRequests(snap.docs.map((d) => ({ ...d.data(), patientId: d.ref.parent.parent.id })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => setAlerts(snap.docs.map((d) => d.data())));
    return () => unsubscribe();
  }, []);

  const patientName = (id) => patients.find((p) => p.id === id)?.firstName || id;

  const adherenceRows = patients
    .filter((p) => !p.archived)
    .map((p) => {
      const logs = doseLogs.filter((l) => l.patientId === p.id);
      const taken = logs.filter((l) => l.status === 'taken').length;
      const missed = logs.length - taken;
      const rate = logs.length ? Math.round((taken / logs.length) * 100) : 0;
      return { name: p.firstName, taken, missed, rate };
    })
    .sort((a, b) => a.rate - b.rate);

  const alertRows = alerts.map((a) => ({
    patient: patientName(a.patientId),
    type: a.type,
    status: a.status,
    date: a.createdAt?.toDate?.().toLocaleString() || '—'
  }));

  const refillRows = refillRequests
    .map((r) => ({
      patient: patientName(r.patientId),
      requested: r.requestedAt?.toDate?.().toLocaleString() || '—',
      status: r.status,
      approved: r.approvedAt?.toDate?.().toLocaleString() || '—',
      sortKey: r.requestedAt?.toDate?.() || new Date(0)
    }))
    .sort((a, b) => b.sortKey - a.sortKey);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="mt-1 text-sm text-text-muted">Exportable summaries across adherence, alerts, and refills.</p>
      </header>

      <div className="fade-in flex flex-col gap-6">
        <Card padded={false}>
          <div className="flex items-center justify-between border-b border-border p-5">
            <h3 className="flex items-center gap-2 text-lg font-semibold"><TrendingUp size={18} className="text-primary" /> Adherence Summary (30d)</h3>
            <Button
              variant="outline"
              onClick={() => downloadCSV(
                'adherence_summary.csv',
                'Patient,Doses Taken,Doses Missed,Adherence Rate\n',
                adherenceRows.map((r) => `"${r.name}",${r.taken},${r.missed},${r.rate}%`)
              )}
            >
              <Download size={16} /> Export CSV
            </Button>
          </div>
          <Table>
            <Thead>
              <Th>Patient</Th>
              <Th>Doses Taken</Th>
              <Th>Doses Missed</Th>
              <Th>Adherence Rate</Th>
            </Thead>
            <tbody>
              {adherenceRows.length === 0 ? (
                <tr><td colSpan="4" className="p-10 text-center text-text-muted">No dose activity in the last 30 days yet.</td></tr>
              ) : (
                adherenceRows.map((r, i) => (
                  <Tr key={i}>
                    <Td className="font-medium">{r.name}</Td>
                    <Td>{r.taken}</Td>
                    <Td>{r.missed}</Td>
                    <Td className={r.rate < 60 ? 'font-semibold text-danger' : 'font-semibold text-success'}>{r.rate}%</Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
        </Card>

        <Card padded={false}>
          <div className="flex items-center justify-between border-b border-border p-5">
            <h3 className="flex items-center gap-2 text-lg font-semibold"><Bell size={18} className="text-warning" /> Alert History</h3>
            <Button
              variant="outline"
              onClick={() => downloadCSV(
                'alert_history.csv',
                'Patient,Type,Status,Date\n',
                alertRows.map((r) => `"${r.patient}",${r.type},${r.status},"${r.date}"`)
              )}
            >
              <Download size={16} /> Export CSV
            </Button>
          </div>
          <Table>
            <Thead>
              <Th>Patient</Th>
              <Th>Type</Th>
              <Th>Status</Th>
              <Th>Date</Th>
            </Thead>
            <tbody>
              {alertRows.length === 0 ? (
                <tr><td colSpan="4" className="p-10 text-center text-text-muted">No alerts recorded yet.</td></tr>
              ) : (
                alertRows.map((r, i) => (
                  <Tr key={i}>
                    <Td className="font-medium">{r.patient}</Td>
                    <Td className="capitalize">{r.type.replace('_', ' ')}</Td>
                    <Td className="capitalize">{r.status}</Td>
                    <Td>{r.date}</Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
        </Card>

        <Card padded={false}>
          <div className="flex items-center justify-between border-b border-border p-5">
            <h3 className="flex items-center gap-2 text-lg font-semibold"><RotateCcw size={18} className="text-primary" /> Refill History</h3>
            <Button
              variant="outline"
              onClick={() => downloadCSV(
                'refill_history.csv',
                'Patient,Requested,Status,Approved\n',
                refillRows.map((r) => `"${r.patient}","${r.requested}",${r.status},"${r.approved}"`)
              )}
            >
              <Download size={16} /> Export CSV
            </Button>
          </div>
          <Table>
            <Thead>
              <Th>Patient</Th>
              <Th>Requested</Th>
              <Th>Status</Th>
              <Th>Approved</Th>
            </Thead>
            <tbody>
              {refillRows.length === 0 ? (
                <tr><td colSpan="4" className="p-10 text-center text-text-muted">No refill requests recorded yet.</td></tr>
              ) : (
                refillRows.map((r, i) => (
                  <Tr key={i}>
                    <Td className="font-medium">{r.patient}</Td>
                    <Td>{r.requested}</Td>
                    <Td className="capitalize">{r.status}</Td>
                    <Td>{r.approved}</Td>
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
