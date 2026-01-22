import nodemailer from 'nodemailer';

/**
 * =============== EMAIL SERVICE ===============
 * Service untuk mengirim email menggunakan SMTP
 * Mendukung Gmail, Mailtrap, atau SMTP lainnya
 */

// Create transporter based on environment
const createTransporter = () => {
  // Use Gmail SMTP for production-like emails
  // You need to enable "Less secure app access" or use App Password
  // For Gmail: https://myaccount.google.com/apppasswords
  
  const config = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER || process.env.SMTP_USER,
      pass: process.env.EMAIL_PASS || process.env.SMTP_PASS,
    },
  };

  // If using Mailtrap for testing
  if (process.env.MAILTRAP_API_TOKEN) {
    config.host = 'sandbox.smtp.mailtrap.io';
    config.port = 587;
    config.auth = {
      user: 'api',
      pass: process.env.MAILTRAP_API_TOKEN,
    };
  }

  return nodemailer.createTransport(config);
};

/**
 * Send email with credentials to new employee
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.employeeName - Employee full name
 * @param {string} options.employeeId - Employee ID for login
 * @param {string} options.email - Employee email for login
 * @param {string} options.password - Employee password (plain text)
 * @param {string} options.companyName - Company name
 * @param {string} options.loginUrl - URL to login page
 */
export const sendEmployeeCredentials = async ({
  to,
  employeeName,
  employeeId,
  email,
  password,
  companyName,
  loginUrl = 'http://localhost:5173/sign-in'
}) => {
  try {
    const transporter = createTransporter();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Selamat Bergabung di ${companyName}</title>
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container { 
      max-width: 600px; 
      margin: 20px auto; 
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header { 
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
      color: white; 
      padding: 30px 20px; 
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .header p {
      margin: 10px 0 0;
      opacity: 0.9;
      font-size: 14px;
    }
    .content { 
      padding: 30px; 
    }
    .greeting {
      font-size: 18px;
      color: #1e3a5f;
      margin-bottom: 20px;
    }
    .credentials-box { 
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      border: 1px solid #cbd5e1;
      border-radius: 10px; 
      padding: 25px; 
      margin: 25px 0;
    }
    .credentials-box h3 {
      margin: 0 0 20px 0;
      color: #1e3a5f;
      font-size: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .credential-item { 
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0; 
      border-bottom: 1px solid #e2e8f0;
    }
    .credential-item:last-child {
      border-bottom: none;
    }
    .credential-label { 
      color: #64748b; 
      font-size: 13px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .credential-value { 
      font-weight: 600; 
      color: #1e293b;
      font-size: 15px;
      background: #ffffff;
      padding: 6px 12px;
      border-radius: 6px;
      font-family: 'Consolas', 'Monaco', monospace;
    }
    .password-value {
      background: #fef3c7;
      color: #92400e;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .login-button { 
      display: inline-block;
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
      color: white; 
      padding: 14px 40px; 
      text-decoration: none; 
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s;
    }
    .login-button:hover {
      transform: translateY(-2px);
    }
    .warning-box { 
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-left: 4px solid #f59e0b;
      padding: 15px 20px; 
      border-radius: 8px;
      margin: 25px 0;
    }
    .warning-box p {
      margin: 0;
      color: #92400e;
      font-size: 14px;
    }
    .footer { 
      background: #f8fafc;
      padding: 25px; 
      text-align: center; 
      color: #64748b;
      font-size: 13px;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      margin: 5px 0;
    }
    .company-logo {
      font-size: 28px;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="company-logo">🏢</div>
      <h1>${companyName}</h1>
      <p>Human Resource Information System</p>
    </div>
    
    <div class="content">
      <p class="greeting">Halo <strong>${employeeName}</strong>,</p>
      
      <p>Selamat bergabung di <strong>${companyName}</strong>! 🎉</p>
      
      <p>Akun HRIS Anda telah berhasil dibuat. Berikut adalah informasi login Anda:</p>
      
      <div class="credentials-box">
        <h3>🔐 Informasi Login</h3>
        
        <div class="credential-item">
          <span class="credential-label">Employee ID</span>
          <span class="credential-value">${employeeId}</span>
        </div>
        
        <div class="credential-item">
          <span class="credential-label">Email</span>
          <span class="credential-value">${email}</span>
        </div>
        
        <div class="credential-item">
          <span class="credential-label">Password</span>
          <span class="credential-value password-value">${password}</span>
        </div>
      </div>
      
      <div class="button-container">
        <a href="${loginUrl}" class="login-button">🚀 Login Sekarang</a>
      </div>
      
      <div class="warning-box">
        <p><strong>⚠️ Penting:</strong> Demi keamanan akun Anda, segera ubah password setelah login pertama kali. Jangan bagikan informasi login ini kepada siapa pun.</p>
      </div>
      
      <p>Jika Anda memiliki pertanyaan atau mengalami kesulitan, silakan hubungi tim HR atau administrator sistem.</p>
      
      <p>Terima kasih dan selamat bekerja! 💼</p>
    </div>
    
    <div class="footer">
      <p><strong>${companyName}</strong></p>
      <p>Email ini dikirim secara otomatis oleh sistem HRIS.</p>
      <p>© ${new Date().getFullYear()} All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
Selamat Bergabung di ${companyName}!

Halo ${employeeName},

Akun HRIS Anda telah berhasil dibuat. Berikut adalah informasi login Anda:

📋 INFORMASI LOGIN
==================
Employee ID : ${employeeId}
Email       : ${email}
Password    : ${password}

🔗 Login URL: ${loginUrl}

⚠️ PENTING: Demi keamanan akun Anda, segera ubah password setelah login pertama kali. Jangan bagikan informasi login ini kepada siapa pun.

Jika Anda memiliki pertanyaan atau mengalami kesulitan, silakan hubungi tim HR atau administrator sistem.

Terima kasih dan selamat bekerja!

--
${companyName}
Human Resource Information System
    `;

    const mailOptions = {
      from: `"${companyName} HRIS" <noreply@${companyName.toLowerCase().replace(/\s+/g, '')}.com>`,
      to: to,
      subject: `🎉 Selamat Bergabung di ${companyName} - Informasi Login HRIS`,
      text: textContent,
      html: htmlContent,
    };

    console.log('📧 Sending email to:', to);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    // Don't throw - email failure shouldn't block employee creation
    return { success: false, error: error.message };
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async ({
  to,
  name,
  resetToken,
  resetUrl
}) => {
  try {
    const transporter = createTransporter();
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>Reset Password</h2>
    <p>Halo ${name},</p>
    <p>Kami menerima permintaan untuk reset password akun Anda.</p>
    <p>Klik tombol di bawah untuk membuat password baru:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}?token=${resetToken}" 
         style="background: #1e3a5f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
        Reset Password
      </a>
    </p>
    <p>Link ini akan expired dalam 1 jam.</p>
    <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: '"HRIS System" <noreply@hris.com>',
      to: to,
      subject: '🔐 Reset Password HRIS',
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send reset email:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Test email configuration
 */
export const testEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email server connection verified');
    return { success: true };
  } catch (error) {
    console.error('❌ Email server connection failed:', error.message);
    return { success: false, error: error.message };
  }
};

export default {
  sendEmployeeCredentials,
  sendPasswordResetEmail,
  testEmailConnection,
};
