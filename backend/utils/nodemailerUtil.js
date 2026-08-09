// utils/nodemailerUtil.js

const nodemailer = require('nodemailer');
const config = require('../config/env.js');

/**
 * ======================================================
 * 🔹 TRANSPORTER SETUP
 * ======================================================
 */

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail', // can switch to SMTP easily
  auth: {
    user: config.EMAIL_USER,
    pass: config.EMAIL_PASS,
  },
});

/**
 * Verify transporter on startup (safe logging only)
 */
transporter.verify((error) => {
  if (error) {
    console.error('[Mailer] Transporter verification failed:', error.message);
  } else {
    console.log('[Mailer] Transporter is ready to send emails');
  }
});

/**
 * ======================================================
 * 🔹 SEND EMAIL
 * ======================================================
 */

async function sendMail(to, subject, html) {
  if (!to || !subject || !html) {
    throw new Error('Missing required email fields');
  }

  const mailOptions = {
    from: `"Auth System" <${config.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);

    console.log('[Mailer] Email sent successfully:', {
      messageId: info.messageId,
      to,
      subject,
    });

    return {
      success: true,
      messageId: info.messageId,
    };

  } catch (err) {
    console.error('[Mailer] Email send error:', err.message);
    return {
      success: false,
      message: 'Failed to send email',
    };
  }
}

module.exports = { sendMail };