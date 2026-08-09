//utils\msg91Util.js
const axios = require('axios');
const config = require('../config/env.js'); // adjust if your config path is different

console.log('[MSG91 Debug] Initializing MSG91 utility');
console.log(`[MSG91 Debug] MSG91_AUTHKEY set: ${!!config.MSG91_AUTHKEY}`);
console.log(`[MSG91 Debug] MSG91_TEMPLATE_ID: ${config.MSG91_TEMPLATE_ID || 'Not set'}`);
console.log(`[MSG91 Debug] MSG91_SENDER_ID: ${config.MSG91_SENDER_ID || 'Not set'}`);

async function msg91UtilsSendOTP(phoneNumber, otp) {
  console.log('[MSG91 Debug] Preparing to send OTP');
  console.log(`[MSG91 Debug] To: ${phoneNumber}`);
  console.log(`[MSG91 Debug] OTP: ${otp}`);

  const url = 'https://control.msg91.com/api/v5/otp';

  const payload = {
    authkey: config.MSG91_AUTHKEY,
    template_id: config.MSG91_TEMPLATE_ID,
    mobile: phoneNumber,
    otp: otp,
    sender: config.MSG91_SENDER_ID || undefined, // optional
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('[MSG91 Debug] OTP sent successfully');
    console.log('[MSG91 Debug] Response:', response.data);

    return response.data;
  } catch (error) {
    console.error('[MSG91 Debug] Failed to send OTP');
    console.error('[MSG91 Debug] Error message:', error.message);
    console.error('[MSG91 Debug] Full error:', error.response?.data || error);
    throw new Error('Failed to send OTP via MSG91');
  }
}

module.exports = { msg91UtilsSendOTP };
