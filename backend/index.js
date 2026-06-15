require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const cron = require('node-cron');

// 🔐 Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// 📡 Initialize Africa's Talking
const credentials = {
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME
};
const AfricasTalking = require('africastalking')(credentials);
const sms = AfricasTalking.SMS;

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); 

// ==========================================
// 📥 INBOUND SMS WEBHOOK & REFILL ALGORITHM
// ==========================================
app.post('/api/incoming-sms', async (req, res) => {
    // --- TIER 3 SECURITY CHECK ---
  const { token } = req.query;
  if (token !== process.env.WEBHOOK_SECRET) {
    console.warn("⚠️ Unauthorized webhook attempt blocked.");
    return res.status(403).send("Forbidden");
  }
  // -----------------------------

  const { from, text } = req.body; // <--- Clean, single declaration!
  console.log(`📩 [WEBHOOK] Message received from ${from}: "${text}"`);
  
    try {
        // Query Firestore to find the patient matching this phone number
        const patientsRef = db.collection('patients');
        const snapshot = await patientsRef.where('phoneNumber', '==', from).get();

        if (snapshot.empty) {
            console.log(`⚠️ Number ${from} is not associated with any registered patient.`);
            res.status(200).send('Patient not found');
            return;
        }

        const patientDoc = snapshot.docs[0];
        const patientData = patientDoc.data();
        
        let currentRisk = patientData.riskScore || 0;
        let currentPills = patientData.pillsRemaining !== undefined ? patientData.pillsRemaining : 30;
        const dose = patientData.pillsPerDay || 1;

        if (text.toUpperCase() === 'Y') {
            // 🧠 ALGORITHM: Reward adherence and deduct the pill inventory
            currentRisk = Math.max(0, currentRisk - 5);
            const newPillCount = Math.max(0, currentPills - dose);

            await patientDoc.ref.update({
                riskScore: currentRisk,
                pillsRemaining: newPillCount
            });

            console.log(`✅ Adherence Logged for ${patientData.firstName}: New Risk = ${currentRisk}, Pills Remaining = ${newPillCount}`);

            await sms.send({
                to: [from],
                message: `Thank you for confirming your intake. Keep up the good work!`,
                from: '21053'
            });

        } else if (text.toUpperCase() === 'N') {
            // 🧠 ALGORITHM: Penalize for missing a dose (Pill count stays unchanged because they skipped it)
            currentRisk += 10;

            await patientDoc.ref.update({
                riskScore: currentRisk
            });

            console.log(`❌ Non-Compliance Logged for ${patientData.firstName}: New Risk = ${currentRisk}. Inventory conserved.`);

            await sms.send({
                to: [from],
                message: `Alert: Medication skipped. Please remember that adherence is vital to your recovery. Your care team has been notified.`,
                from: '21053'
            });
        } else {
            // Unknown input fallback
            await sms.send({
                to: [from],
                message: `Invalid reply. Please respond with 'Y' to confirm intake, or 'N' if skipped.`,
                from: '21053'
            });
        }

        res.status(200).send('SMS Processed Successfully');

    } catch (error) {
        console.error("❌ Webhook processing failed:", error);
        res.status(500).send('Internal Server Error');
    }
});

// ==========================================
// ⏰ AUTOMATED SCHEDULER (Runs daily at 8 AM)
// ==========================================
cron.schedule('0 8 * * *', async () => {
    console.log(`\n⏰ [SCHEDULER] Running daily screening engine...`);
    
    try {
        const patientsRef = db.collection('patients');
        const snapshot = await patientsRef.get();

        if (snapshot.empty) return;

        snapshot.forEach(async (doc) => {
            const patientData = doc.data();
            
            if (patientData.phoneNumber) {
                // If the patient is completely out of medicine, adjust message to prompt refill
                const isOut = (patientData.pillsRemaining || 0) <= 0;
                
                const messageString = isOut 
                    ? `DawaLoop Emergency: You have run out of your medication. Please visit the clinic immediately for a refill.`
                    : `DawaLoop Alert: Hello ${patientData.firstName}, it is time to take your medication. Reply 'Y' to confirm intake, or 'N' if skipped.`;

                await sms.send({
                    to: [patientData.phoneNumber],
                    message: messageString,
                    from: '21053'
                });
            }
        });

    } catch (error) {
        console.error("❌ Scheduler error:", error);
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 DawaLoop Backend Engine live and listening on port ${PORT}`);
});
