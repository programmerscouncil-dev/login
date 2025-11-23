const express = require('express');
const cors = require('cors');
const brevo = require('@getbrevo/brevo');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const CONFIG = {
  BREVO_API_KEY: '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',
  MAIL_SENDER: 'programmerscouncil@gmail.com'
};

// Initialize Brevo
const brevoClient = brevo.ApiClient.instance;
const brevoApiKey = brevoClient.authentications['api-key'];
brevoApiKey.apiKey = CONFIG.BREVO_API_KEY;
const brevoTransactional = new brevo.TransactionalEmailsApi();

app.use(cors());
app.use(express.json());

// Store OTPs in memory (for demo)
const otpStore = new Map();

// Send OTP Email
async function sendOtpEmail(email, code) {
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = 'Your Horus OTP Code';
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #e0a640;">Programmer's Council Login</h2>
        <p>Your OTP verification code is:</p>
        <h1 style="font-size: 32px; color: #e0a640; letter-spacing: 8px;">${code}</h1>
        <p>This code will expire in 10 minutes.</p>
      </div>
    `;
    sendSmtpEmail.sender = { name: "Programmer's Council", email: CONFIG.MAIL_SENDER };
    sendSmtpEmail.to = [{ email: email }];

    console.log('Sending OTP to:', email);
    await brevoTransactional.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Email sent successfully!');
    return true;
  } catch (error) {
    console.error('❌ Email error:', error);
    throw error;
  }
}

// API Routes
app.post('/sendCode', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.endsWith('@horus.edu.eg')) {
      return res.json({ status: 'error', message: 'Invalid email domain' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    // Store OTP
    otpStore.set(email, { code, expiresAt });
    
    // Send email
    await sendOtpEmail(email, code);
    
    res.json({ status: 'ok', message: 'OTP sent successfully' });
  } catch (error) {
    res.json({ status: 'error', message: 'Failed to send OTP' });
  }
});

app.post('/verifyCode', async (req, res) => {
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
    const token = uuidv4();
    
    res.json({ 
      status: 'success', 
      token: token
    });
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

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Horus OTP API running on port ${PORT}`);
});
