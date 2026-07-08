require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const cron = require('node-cron');
const CryptoJS = require('crypto-js');

// 🔐 ENCRYPTION CONFIGURATION
const SECRET_KEY = "dawacore_secure_2026"; 

const decryptData = (cipherText) => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || cipherText; 
  } catch (error) { return cipherText; }
};

function getValidPhoneNumber(encryptedPhone) {
  try {
    let phone = decryptData(encryptedPhone);
    if (!phone) return null;

    // Clean up spaces and dashes
    phone = phone.replace(/[\s-]/g, '');

    // Force E.164 format to prevent Africa's Talking crashes
    if (phone.startsWith('0')) {
      phone = '+254' + phone.substring(1);
    } else if (phone.startsWith('254')) {
      phone = '+' + phone;
    } else if (!phone.startsWith('+')) {
      phone = '+254' + phone; 
    }
    return phone;
  } catch (error) {
    return null; 
  }
}

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

// --- UPTIMEROBOT HEALTH CHECK ---
app.get('/', (req, res) => {
  res.status(200).send("DawaCore Engine is Awake and Listening");
});

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

  const { from, text } = req.body; 
  console.log(`📩 [WEBHOOK] Message received from ${from}: "${text}"`);
  
    try {
        // Fetch all patients and find the match in memory because the DB is encrypted
        const patientsRef = db.collection('patients');
        const snapshot = await patientsRef.get();

        let targetPatientDoc = null;
        let targetPatientData = null;

        for (const doc of snapshot.docs) {
            const pData = doc.data();
            const validPhone = getValidPhoneNumber(pData.phoneNumber);
            // Check if the decrypted database number matches the Africa's Talking sender
            if (validPhone === from) {
                targetPatientDoc = doc;
                targetPatientData = pData;
                break;
            }
        }

        if (!targetPatientDoc) {
            console.log(`⚠️ Number ${from} is not associated with any registered patient.`);
            res.status(200).send('Patient not found');
            return;
        }
        
        let currentRisk = targetPatientData.riskScore || 0;
        let currentPills = targetPatientData.pillsRemaining !== undefined ? targetPatientData.pillsRemaining : 30;
        const dose = targetPatientData.pillsPerDay || 1;
        const decryptedName = decryptData(targetPatientData.firstName);

        if (text.toUpperCase() === 'Y') {
            // 🧠 ALGORITHM: Reward adherence and deduct the pill inventory
            currentRisk = Math.max(0, currentRisk - 5);
            const newPillCount = Math.max(0, currentPills - dose);

            await targetPatientDoc.ref.update({
                riskScore: currentRisk,
                pillsRemaining: newPillCount
            });

            console.log(`✅ Adherence Logged for ${decryptedName}: New Risk = ${currentRisk}, Pills Remaining = ${newPillCount}`);

            await sms.send({
                to: [from],
                message: `Thank you for confirming your intake. Keep up the good work!`,
                from: '21053'
            });

        } else if (text.toUpperCase() === 'N') {
            // 🧠 ALGORITHM: Penalize for missing a dose
            currentRisk += 10;

            await targetPatientDoc.ref.update({
                riskScore: currentRisk
            });

            console.log(`❌ Non-Compliance Logged for ${decryptedName}: New Risk = ${currentRisk}. Inventory conserved.`);

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
  console.log("Running daily adherence check...");
  try {
      const patientsRef = db.collection('patients');
      const snapshot = await patientsRef.get();

      if (snapshot.empty) return;

      // Use a for...of loop to safely handle asynchronous SMS dispatching
      for (const doc of snapshot.docs) {
          try {
              const patientData = doc.data();
              const validPhone = getValidPhoneNumber(patientData.phoneNumber);

              // If the number is corrupt or decryption failed, skip this patient so the server doesn't crash
              if (!validPhone) {
                  console.log(`Skipping doc ${doc.id} - Invalid or corrupt phone number.`);
                  continue; 
              }
              
              const decryptedName = decryptData(patientData.firstName).split(' ')[0]; // Get just the first name
              const isOut = (patientData.pillsRemaining || 0) <= 0;
              
              const messageString = isOut 
                  ? `DawaLoop Emergency: You have run out of your medication. Please visit the clinic immediately for a refill.`
                  : `DawaLoop Alert: Hello ${decryptedName}, it is time to take your medication. Reply 'Y' to confirm intake, or 'N' if skipped.`;

              await sms.send({
                  to: [validPhone],
                  message: messageString,
                  from: '21053'
              });
              
              console.log(`Daily reminder sent successfully to ${decryptedName} at ${validPhone}`);
              
          } catch (innerError) {
              console.error(`❌ Failed to send SMS to doc ${doc.id}:`, innerError.message);
          }
      }

  } catch (error) {
      console.error("❌ Scheduler error:", error);
  }
}, {
  scheduled: true,
  timezone: "Africa/Nairobi" 
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 DawaLoop Backend Engine live and listening on port ${PORT}`);
});