const ALERT_MESSAGES = {
  high_risk: (name) => `${name} has crossed the high-risk adherence threshold.`,
  low_stock: (name) => `${name} is running low on medication (7 days or fewer remaining).`
};

// Mirrors frontend/src/lib/alerts.js — alerts are looked up by a single
// equality filter (patientId) and filtered by type/status in memory,
// deliberately avoiding a where+where composite index for a small per-patient
// result set.
async function findOpenAlert(db, patientId, type) {
  const snap = await db.collection('alerts').where('patientId', '==', patientId).get();
  return snap.docs.find((d) => d.data().type === type && d.data().status === 'open');
}

async function upsertAlert(db, admin, patientId, type, patientName) {
  const existing = await findOpenAlert(db, patientId, type);
  if (existing) return;

  await db.collection('alerts').add({
    patientId,
    type,
    message: ALERT_MESSAGES[type](patientName),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'open',
    acknowledgedAt: null
  });
}

async function dismissAlertsByType(db, admin, patientId, type) {
  const snap = await db.collection('alerts').where('patientId', '==', patientId).get();
  const openMatches = snap.docs.filter((d) => d.data().type === type && d.data().status === 'open');

  await Promise.all(
    openMatches.map((d) =>
      d.ref.update({ status: 'dismissed', acknowledgedAt: admin.firestore.FieldValue.serverTimestamp() })
    )
  );
}

module.exports = { upsertAlert, dismissAlertsByType };
