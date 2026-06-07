const admin = require('firebase-admin');

// This points to the secret key file you just dropped in
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

console.log("Firebase Admin successfully connected!");

module.exports = { db };