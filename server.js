const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Store OTPs in memory
const otpStore = new Map();

// Send email via Brevo API
async function sendOtpEmail(email, code) {
  const BREVO_API_KEY = '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';
  
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: {
        name: "Programmer's Council",
        email: 'programmerscouncil@gmail.com'
      },
      to: [{ email: email }],
      subject: 'Your Horus OTP Code',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #e0a640;">Programmer's Council Login</h2>
          <p>Your OTP verification code is:</p>
          <h1 style="font-size: 32px; color: #e0a640; letter-spacing: 8px;">${code}</h1>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `
    })
  });

  if (!response.ok) {
    throw new Error('Failed to send email');
  }

  return response.json();
}

// Routes
app.post('/sendCode', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.endsWith('@horus.edu.eg')) {
      return res.json({ status: 'error', message: 'Invalid email domain' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    
    otpStore.set(email, { code, expiresAt });
    
    await sendOtpEmail(email, code);
    
    res.json({ status: 'ok', message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.json({ status: 'error', message: 'Failed to send OTP' });
  }
});

app.post('/verifyCode', (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !email.endsWith('@horus.edu.eg')) {
      return res.json({ status: 'error', message: 'Invalid email' });
    }

    const otpData = otpStore.get(email);
    
    if (!otpData) {
      return res.json({ status: 'error', message: 'No OTP found' });
    }

    if (Date.now() > otpData.expiresAt) {
      otpStore.delete(email);
      return res.json({ status: 'error', message: 'OTP expired' });
    }

    if (otpData.code !== code) {
      return res.json({ status: 'error', message: 'Invalid code' });
    }

    otpStore.delete(email);
    const token = 'token_' + Date.now();
    
    res.json({ status: 'success', token });
  } catch (error) {
    res.json({ status: 'error', message: 'Verification failed' });
  }
});

app.post('/verifyToken', (req, res) => {
  res.json({ valid: true });
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Horus OTP API is running!' });
});

// Vercel requires module.exports for serverless
module.exports = app;
