import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { Users, AlertTriangle, Pill } from 'lucide-react';
import { db } from '../firebase';
import { Card, Badge, StatTile, Table, Thead, Th, Td, Tr } from '../components/ui';

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

const LOW_STOCK_DAYS = 7;

export default function Inventory() {
  const [patients, setPatients] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'patients'), (snapshot) => {
      setPatients(
        snapshot.docs.map((doc) => {
          const raw = doc.data();
          return { id: doc.id, ...raw, firstName: raw.firstName ? decryptData(raw.firstName) : 'Unknown' };
        })
      );
    });
    return () => unsubscribe();
  }, []);

  const rows = patients
    .filter((p) => !p.archived)
    .map((p) => {
      const dose = p.pillsPerDay || 1;
      const pillsRemaining = p.pillsRemaining ?? 0;
      const daysLeft = Math.floor(pillsRemaining / dose);
      return { ...p, dose, pillsRemaining, daysLeft };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const lowStockCount = rows.filter((r) => r.daysLeft <= LOW_STOCK_DAYS).length;
  const totalPillsInField = rows.reduce((sum, r) => sum + r.pillsRemaining, 0);

  const medicationGroups = Object.entries(
    rows.reduce((acc, r) => {
      const med = r.medication || 'Unspecified';
      if (!acc[med]) acc[med] = { patients: 0, pills: 0 };
      acc[med].patients += 1;
      acc[med].pills += r.pillsRemaining;
      return acc;
    }, {})
  ).sort((a, b) => b[1].patients - a[1].patients);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Inventory & Supply Chain</h1>
        <p className="mt-1 text-sm text-text-muted">Live medication stock levels across the patient population.</p>
      </header>

      <div className="fade-in">
        <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <StatTile label="Patients Tracked" value={rows.length} accent="primary" valueColor="main" icon={Users} />
          <StatTile label="Low Stock (≤7 days)" value={lowStockCount} accent="danger" icon={AlertTriangle} />
          <StatTile label="Total Pills in Field" value={totalPillsInField} accent="success" icon={Pill} />
        </div>

        <Card className="mb-6">
          <h3 className="mb-4 font-semibold">Stock by Medication</h3>
          <div className="flex flex-wrap gap-3">
            {medicationGroups.map(([name, stats]) => (
              <div key={name} className="rounded-control border border-border bg-bg-base px-4 py-3">
                <div className="text-sm font-semibold">{name}</div>
                <div className="text-xs text-text-muted">{stats.patients} patients · {stats.pills} pills remaining</div>
              </div>
            ))}
          </div>
        </Card>

        <Card padded={false}>
          <div className="border-b border-border p-5">
            <h3 className="font-semibold">Supply Levels (most urgent first)</h3>
          </div>
          <Table>
            <Thead>
              <Th>Patient</Th>
              <Th>Medication</Th>
              <Th>Daily Dose</Th>
              <Th>Pills Remaining</Th>
              <Th>Days Left</Th>
            </Thead>
            <tbody>
              {rows.map((r) => (
                <Tr key={r.id} onClick={() => navigate(`/admin/patients/${r.id}`)} className="cursor-pointer hover:bg-bg-base">
                  <Td className="font-medium">{r.firstName}</Td>
                  <Td>{r.medication || 'Unspecified'}</Td>
                  <Td>{r.dose}x daily</Td>
                  <Td>{r.pillsRemaining}</Td>
                  <Td>
                    <Badge tone={r.daysLeft <= LOW_STOCK_DAYS ? 'danger' : 'success'}>{r.daysLeft}d</Badge>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
