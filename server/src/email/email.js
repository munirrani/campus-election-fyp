const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

async function sendEmail(ethereumAddress, email, URL) {

  let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.NODEMAILER_EMAIL,
      pass: process.env.NODEMAILER_PASSWORD,
    },
  });

  const htmlContent = `
    <div style="width: 100%; padding: 0 15px; font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto;">
        <h1 style="color: #444; font-size: 22px; margin-bottom: 20px;">Verify your Ethereum address</h1>
        <p style="color: #444; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">Click the button below to verify your Ethereum address of <b>${ethereumAddress}</b></p>
        <div>
          <a href="${URL}" style="background-color: #26A33A; color: #ffffff; text-decoration: none; padding: 10px 20px; font-size: 16px; border-radius: 5px; display: inline-block;">Confirm my address</a>
        </div>
      </div>
    </div>
  `;

  const mailOptions = {
    from: '"UM Campus Election Committee"',
    to: email,
    subject: "Verify your Address for UM Campus Election",
    html: htmlContent,
  }

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
  
}

module.exports = { 
  sendEmail: sendEmail,
}