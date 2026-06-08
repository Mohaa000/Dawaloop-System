require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

// 🔐 Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Initialize the Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); 

// 📥 INBOUND SMS WEBHOOK (Integrated with Firestore)
app.post('/api/incoming-sms', async (req, res) => {
    const { from, text, date } = req.body;
    const cleanText = text.trim().toUpperCase();

    console.log(`\n=========================================`);
    console.log(`📩 INCOMING SMS CAUGHT!`);
    console.log(`From: ${from} | Message: "${cleanText}"`);

    try {
        // 1. Search Firestore for the patient using their phone number
        const patientsRef = db.collection('patients');
        const snapshot = await patientsRef.where('phoneNumber', '==', from).get();

        if (snapshot.empty) {
            console.log(`⚠️ Unregistered number. No patient found for ${from}.`);
        } else {
            // 2. Loop through matches (usually just one) and update the risk score
            snapshot.forEach(async (doc) => {
                const patientData = doc.data();
                let currentRisk = patientData.riskScore || 0;
                let newRisk = currentRisk;

                if (cleanText === 'Y') {
                    // Patient took medication: Decrease risk score (minimum 0)
                    newRisk = Math.max(0, currentRisk - 10);
                    console.log(`✅ Adherence Confirmed for ${patientData.firstName}. Risk lowered to ${newRisk}.`);
                } else if (cleanText === 'N') {
                    // Patient skipped medication: Spike risk score
                    newRisk = currentRisk + 20;
                    console.log(`🚨 Non-adherence Logged for ${patientData.firstName}! Risk spiked to ${newRisk}.`);
                } else {
                    console.log(`ℹ️ Unrecognized response format from ${patientData.firstName}.`);
                }

                // 3. Commit the new score to the cloud
                await db.collection('patients').doc(doc.id).update({
                    riskScore: newRisk,
                    lastInteraction: date
                });
            });
        }
    } catch (error) {
        console.error("❌ Database update failed:", error);
    }

    console.log(`=========================================\n`);
    res.status(200).send('Message processed securely');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 DawaLoop Backend Engine live and listening on port ${PORT}`);
});