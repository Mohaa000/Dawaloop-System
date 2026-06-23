require('dotenv').config();
console.log("Checking API Key Load:", process.env.AT_API_KEY ? "Key Exists" : "Key is Missing!");
const africastalking = require('africastalking');

// Initialize Africa's Talking
const credentials = {
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME,
};
const AT = africastalking(credentials);

// Get the SMS service
const sms = AT.SMS;

// Function to send a dose reminder
async function sendReminder(patientPhone, patientName, medication) {
    const options = {
        // Set the numbers you want to send to in international format
        to: [patientPhone],
        // The message to send
        message: `DawaCore Alert: Hello ${patientName}, it is time to take your ${medication}. Please reply with 'Y' to confirm intake, or 'N' if you skipped.`,
        // Set your sender id (in sandbox, leave this out or use a shortcode if you generated one)
        // from: '21053' 
    };

    try {
        const response = await sms.send(options);
        console.log(`✅ SMS Dispatched to ${patientPhone}:`, response);
        return true;
    } catch (error) {
        console.error(`❌ Failed to send SMS to ${patientPhone}:`, error);
        return false;
    }
}

// Quick Test Execution (We will remove this after verifying it works)
if (require.main === module) {
    console.log("Testing SMS Dispatcher...");
    // REPLACE THIS WITH A REAL PHONE NUMBER TO TEST (Must include +254)
    sendReminder("+254796664025", "Test Patient", "Metformin");
}

module.exports = { sendReminder };