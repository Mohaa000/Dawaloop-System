import { collection, addDoc, query, where, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const ALERT_MESSAGES = {
  high_risk: (patientName) => `${patientName} has crossed the high-risk adherence threshold.`,
  low_stock: (patientName) => `${patientName} is running low on medication (7 days or fewer remaining).`,
  refill_requested: (patientName) => `${patientName} requested a medication refill.`
};

// Alerts are looked up by a single equality filter (patientId) and filtered by
// type/status client-side, deliberately avoiding a where+where composite index
// for what's always a small per-patient result set.
async function findOpenAlert(patientId, type) {
  const snap = await getDocs(query(collection(db, 'alerts'), where('patientId', '==', patientId)));
  return snap.docs.find((d) => d.data().type === type && d.data().status === 'open');
}

export async function upsertAlert(patientId, type, patientName) {
  const existing = await findOpenAlert(patientId, type);
  if (existing) return;

  await addDoc(collection(db, 'alerts'), {
    patientId,
    type,
    message: ALERT_MESSAGES[type](patientName),
    createdAt: serverTimestamp(),
    status: 'open',
    acknowledgedAt: null
  });
}

export async function dismissAlertsByType(patientId, type) {
  const snap = await getDocs(query(collection(db, 'alerts'), where('patientId', '==', patientId)));
  const openMatches = snap.docs.filter((d) => d.data().type === type && d.data().status === 'open');

  await Promise.all(
    openMatches.map((d) => updateDoc(d.ref, { status: 'dismissed', acknowledgedAt: serverTimestamp() }))
  );
}

// Used when archiving a patient — clears every open alert of any type, since
// a patient no longer being monitored shouldn't keep surfacing alerts.
export async function dismissAllAlertsForPatient(patientId) {
  const snap = await getDocs(query(collection(db, 'alerts'), where('patientId', '==', patientId)));
  const openMatches = snap.docs.filter((d) => d.data().status === 'open');

  await Promise.all(
    openMatches.map((d) => updateDoc(d.ref, { status: 'dismissed', acknowledgedAt: serverTimestamp() }))
  );
}
