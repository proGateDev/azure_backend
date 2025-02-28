const sgMail = require('@sendgrid/mail');
require('dotenv').config();

// Set SendGrid API Key from environment variables
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Sends an email using SendGrid
 * @param {Object} mailOptions - The mail options
 * @param {string} mailOptions.to - The recipient email address
 * @param {string} mailOptions.from - The sender email address (must be verified in SendGrid)
 * @param {string} mailOptions.subject - The subject of the email
 * @param {string} mailOptions.text - The plain text content of the email
 * @param {string} mailOptions.html - The HTML content of the email
 * @returns {Promise} - A promise that resolves when the email is sent
 */
function sendEmail({ to, from, subject, text, html }) {
  const msg = {
    to,           // recipient
    from,         // sender (must be verified in SendGrid)
    subject,      // subject of the email
    text,         // plain text version of the message
    html          // HTML version of the message
  };

  // Send email via SendGrid
  return sgMail
    .send(msg)
    .then(() => {
      console.log(`Email sent successfully to ${to}`);
    })
    .catch((error) => {
      console.error(`Failed to send email: ${error}`);
    });
}

module.exports = sendEmail;  // Directly export the function
