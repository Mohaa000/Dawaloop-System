require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const cron = require('node-cron'); // 👈 Import the cron scheduler

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

// Initialize the Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); 

// ==========================================
// 📥 INBOUND SMS WEBHOOK (Existing Logic)
// ==========================================
app.post('/api/incoming-sms', async (req, res) => {
    // ... [KEEP YOUR EXISTING WEBHOOK CODE HERE] ...
});

// ==========================================
// ⏰ AUTOMATED SCHEDULER (New Logic)
// ==========================================
// Note: '* * * * *' means it will run EVERY MINUTE for testing purposes.
// Once tested, we will change it to run once a day (e.g., '0 8 * * *' for 8:00 AM).
cron.schedule('0 8 * * *', async () => {
    console.log(`\n⏰ [SCHEDULER] Scanning database for scheduled reminders...`);
    
    try {
        const patientsRef = db.collection('patients');
        const snapshot = await patientsRef.get();

        if (snapshot.empty) {
            console.log('⚠️ No patients found in the database.');
            return;
        }

        // Loop through every patient in the database
        snapshot.forEach(async (doc) => {
            const patientData = doc.data();
            
            // Only send if they have a valid phone number
            if (patientData.phoneNumber) {
                const options = {
                    to: [patientData.phoneNumber],
                    message: `DawaLoop Alert: Hello, it is time to take your medication. Please reply with 'Y' to confirm intake, or 'N' if you skipped.`,
                    from: '12345' // Ensure your Sandbox shortcode is here
                };

                // Dispatch the SMS
                await sms.send(options);
                console.log(`✅ Automated reminder sent to ${patientData.phoneNumber}`);
            }
        });

    } catch (error) {
        console.error("❌ Scheduler failed:", error);
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 DawaLoop Backend Engine live and listening on port ${PORT}`);
});