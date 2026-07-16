import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { AlertTriangle, Pill, RotateCcw, Check, X, BellOff } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Card, Badge, Button, EmptyState } from '../components/ui';

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

const TABS = ['Open', 'Acknowledged', 'Dismissed'];

const TYPE_LABELS = {
  high_risk: { label: 'High Risk', tone: 'danger', icon: AlertTriangle },
  low_stock: { label: 'Low Stock', tone: 'warning', icon: Pill },
  refill_requested: { label: 'Refill Requested', tone: 'primary', icon: RotateCcw }
};

export default function AlertsCenter() {
  const [alerts, setAlerts] = useState([]);
  const [patientNames, setPatientNames] = useState({});
  const [activeTab, setActiveTab] = useState('Open');
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const basePath = `/${userRole}`;

  useEffect(() => {
    const q = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'), limit(150));
    const unsubscribe = onSnapshot(q, (snap) => setAlerts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'patients'), (snap) => {
      const names = {};
      snap.docs.forEach((d) => {
        const raw = d.data();
        names[d.id] = raw.firstName ? decryptData(raw.firstName) : 'Unknown';
      });
      setPatientNames(names);
    });
    return () => unsubscribe();
  }, []);

  const handleAcknowledge = async (alertId) => {
    await updateDoc(doc(db, 'alerts', alertId), { status: 'acknowledged', acknowledgedAt: serverTimestamp() });
  };

  const handleDismiss = async (alertId) => {
    await updateDoc(doc(db, 'alerts', alertId), { status: 'dismissed', acknowledgedAt: serverTimestamp() });
  };

  const statusForTab = { Open: 'open', Acknowledged: 'acknowledged', Dismissed: 'dismissed' };
  const visibleAlerts = alerts.filter((a) => a.status === statusForTab[activeTab]);
  const openCount = alerts.filter((a) => a.status === 'open').length;

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Alerts & Notification Center</h1>
        <p className="mt-1 text-sm text-text-muted">{openCount} open alert{openCount === 1 ? '' : 's'} need attention.</p>
      </header>

      <div className="fade-in">
        <div className="mb-6 flex gap-2 border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-4 py-2.5 text-sm font-semibold ${
                activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-text-muted'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {visibleAlerts.length === 0 ? (
            <Card><EmptyState icon={BellOff} title={`No ${activeTab.toLowerCase()} alerts`} description="You're all caught up here." /></Card>
          ) : (
            visibleAlerts.map((alert) => {
              const typeInfo = TYPE_LABELS[alert.type] || { label: alert.type, tone: 'neutral' };
              return (
                <Card key={alert.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Badge tone={typeInfo.tone} icon={typeInfo.icon}>{typeInfo.label}</Badge>
                    <div>
                      <button
                        onClick={() => navigate(`${basePath}/patients/${alert.patientId}`)}
                        className="text-sm font-semibold hover:text-primary"
                      >
                        {patientNames[alert.patientId] || alert.patientId}
                      </button>
                      <div className="text-sm text-text-muted">{alert.message}</div>
                      <div className="text-xs text-text-muted">{alert.createdAt?.toDate?.().toLocaleString() || '—'}</div>
                    </div>
                  </div>
                  {activeTab === 'Open' && (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => handleAcknowledge(alert.id)}><Check size={16} /> Acknowledge</Button>
                      <Button variant="danger" onClick={() => handleDismiss(alert.id)}><X size={16} /> Dismiss</Button>
                    </div>
                  )}
                  {activeTab === 'Acknowledged' && (
                    <Button variant="danger" onClick={() => handleDismiss(alert.id)}><X size={16} /> Dismiss</Button>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
