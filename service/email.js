const formData = require('form-data');
const Mailgun = require('mailgun.js');

require('dotenv').config();
//==================================================

const API_KEY = process.env.MAILGUN_API_KEY;
// const API_KEY = "995008a81758ff8dbfa3cff699760b83";
// const API_KEY="81de212cf0dad8d4781276adcd9a711e-1b5736a5-e767baa3"
const DOMAIN = process.env.MAILGUN_DOMAIN;

// const DOMAIN = "sandbox36e8e55337dc4d6d812e8aa5e431ef9b.mailgun.org";
const mailgun = new Mailgun(formData);
const mg = mailgun.client({ username: 'api', key: API_KEY });


function sendMail({ from, to, subject, text, html }) {
  return mg.messages.create(DOMAIN, {
    from: from,
    to: to,
    subject: subject,
    text: text,
    html: html
  });
}


module.exports = sendMail