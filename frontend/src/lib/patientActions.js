import {
  doc,
  collection,
  writeBatch,
  serverTimestamp,
  getDocs,
  updateDoc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { upsertAlert, dismissAlertsByType, dismissAllAlertsForPatient } from './alerts';
import { setAccountDisabled } from './api';

const LOW_STOCK_THRESHOLD = 7;

// Each action below updates the aggregate patient fields AND writes the
// matching audit-trail subcollection entry in one batch, so no page has to
// remember to do both.

export async function logDoseTaken(patient) {
  const dose = patient.pillsPerDay || 1;
  const newPillsRemaining = Math.max(0, patient.pillsRemaining - dose);

  const batch = writeBatch(db);
  batch.update(doc(db, 'patients', patient.id), { pillsRemaining: newPillsRemaining });
  batch.set(doc(collection(db, 'patients', patient.id, 'doseLogs')), {
    timestamp: serverTimestamp(),
    status: 'taken',
    source: 'portal'
  });
  await batch.commit();

  if (newPillsRemaining <= LOW_STOCK_THRESHOLD) {
    await upsertAlert(patient.id, 'low_stock', patient.firstName);
  }

  return newPillsRemaining;
}

export async function requestRefill(patient) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'patients', patient.id), { status: 'Refill Requested' });
  batch.set(doc(collection(db, 'patients', patient.id, 'refillRequests')), {
    requestedAt: serverTimestamp(),
    status: 'pending',
    approvedAt: null
  });
  await batch.commit();

  await upsertAlert(patient.id, 'refill_requested', patient.firstName);
}

export async function approveRefill(patient, defaultPills = 30) {
  // Avoids a where+orderBy composite index: pull the last few requests
  // (single-field order, auto-indexed) and pick the pending one client-side.
  const recent = await getDocs(
    query(collection(db, 'patients', patient.id, 'refillRequests'), orderBy('requestedAt', 'desc'), limit(5))
  );
  const pending = recent.docs.find((d) => d.data().status === 'pending');

  const batch = writeBatch(db);
  batch.update(doc(db, 'patients', patient.id), { pillsRemaining: defaultPills, status: 'Active' });
  if (pending) batch.update(pending.ref, { status: 'approved', approvedAt: serverTimestamp() });
  await batch.commit();

  await Promise.all([
    dismissAlertsByType(patient.id, 'refill_requested'),
    dismissAlertsByType(patient.id, 'low_stock')
  ]);
}

// Archiving is reversible: the patient record and its history are kept, but
// they stop appearing in active monitoring, stop receiving SMS reminders,
// and (if they have a login) can no longer sign in.
export async function archivePatient(patient) {
  await updateDoc(doc(db, 'patients', patient.id), { archived: true, archivedAt: serverTimestamp() });

  const tasks = [dismissAllAlertsForPatient(patient.id)];
  if (patient.authUid) tasks.push(setAccountDisabled(patient.authUid, true));
  await Promise.all(tasks);
}

export async function reactivatePatient(patient) {
  await updateDoc(doc(db, 'patients', patient.id), { archived: false, archivedAt: null });
  if (patient.authUid) await setAccountDisabled(patient.authUid, false);
}
