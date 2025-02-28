const nodemailer = require('nodemailer');
require('dotenv').config();

// Google SMTP credentials from environment variables
const EMAIL = 'gupta.nischal014@gmail.com'; // Your Gmail or Google Workspace email
const PASSWORD = 'TonyStark007'; // Your Google app password (or regular password if 2FA is not enabled)

// Create a transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can also use 'smtp.gmail.com' and specify the port
  auth: {
    user: EMAIL,
    pass: PASSWORD,
  },
});

// Function to send email
function sendMail({ from, to, subject, text, html }) {
  const mailOptions = {
    from: from || EMAIL, // Default sender is the Google email
    to: to,
    subject: subject,
    text: text,
    html: html,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = sendMail;
