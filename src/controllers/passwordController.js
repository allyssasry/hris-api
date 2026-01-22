import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../utils/prisma.js";
import nodemailer from "nodemailer";

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/* =========================================================
   FORGOT PASSWORD (KIRIM EMAIL)
   ========================================================= */

   
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  console.log("🔥 FORGOT PASSWORD HIT", req.body);

  if (!email) {
    return res.status(400).json({ message: "Email wajib diisi" });
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    // Security: don't reveal if email exists or not
    return res.json({
      message: "Jika email terdaftar, link reset akan dikirim.",
    });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: token,
      resetPasswordExp: expiry,
    },
  });

  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/set-new-password?token=${token}`;

  // Get company name if user has one
  let companyName = "HRIS";
  if (user.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { name: true }
    });
    if (company?.name) companyName = company.name;
  }

  // Send email using Gmail SMTP
  try {
    const transporter = createTransporter();
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password</title>
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
      background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
      color: white; 
      padding: 30px 20px; 
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content { 
      padding: 30px; 
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .reset-button { 
      display: inline-block;
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
      color: white; 
      padding: 14px 40px; 
      text-decoration: none; 
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
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
      padding: 20px; 
      text-align: center; 
      color: #64748b;
      font-size: 12px;
      border-top: 1px solid #e2e8f0;
    }
    .link-text {
      word-break: break-all;
      font-size: 12px;
      color: #64748b;
      margin-top: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 40px; margin-bottom: 10px;">🔐</div>
      <h1>Reset Password</h1>
    </div>
    
    <div class="content">
      <p>Halo,</p>
      
      <p>Kami menerima permintaan untuk mereset password akun HRIS Anda.</p>
      
      <p>Klik tombol di bawah untuk membuat password baru:</p>
      
      <div class="button-container">
        <a href="${resetLink}" class="reset-button">🔑 Reset Password</a>
      </div>
      
      <div class="warning-box">
        <p><strong>⏰ Link ini hanya berlaku selama 15 menit.</strong></p>
        <p style="margin-top: 8px;">Jika Anda tidak meminta reset password, abaikan email ini. Password Anda tidak akan berubah.</p>
      </div>
      
      <p class="link-text">Jika tombol tidak berfungsi, copy paste link ini di browser:<br>${resetLink}</p>
    </div>
    
    <div class="footer">
      <p><strong>${companyName}</strong></p>
      <p>Email ini dikirim secara otomatis. Jangan membalas email ini.</p>
    </div>
  </div>
</body>
</html>
    `;

    await transporter.sendMail({
      from: `"${companyName} HRIS" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔐 Reset Password - HRIS",
      html: htmlContent,
    });

    console.log(`✅ Password reset email sent to ${email}`);
    
    return res.json({
      message: "Jika email terdaftar, link reset akan dikirim.",
    });

  } catch (error) {
    console.error("❌ Failed to send reset email:", error.message);
    return res.status(500).json({
      message: "Gagal mengirim email. Coba lagi nanti.",
    });
  }
};


/* =========================================================
   RESET PASSWORD
   ========================================================= */
export const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password)
    return res.status(400).json({ message: "Data tidak lengkap" });
if (password.length < 6) {
  return res.status(400).json({
    message: "Password minimal 6 karakter",
  });
}

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: token,
      resetPasswordExp: { gte: new Date() },
    },
  });

  if (!user)
    return res.status(400).json({ message: "Token tidak valid atau expired" });

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExp: null,
    },
  });

  return res.json({ message: "Password berhasil direset" });
};
