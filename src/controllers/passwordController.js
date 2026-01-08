import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../utils/prisma.js";
import {   transporter } from "../utils/mailer.js";

/* =========================================================
   FORGOT PASSWORD (KIRIM EMAIL)
   ========================================================= */

   
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  console.log("🔥 FORGOT PASSWORD HIT", req.body);
console.log("MAILTRAP TOKEN:", process.env.MAILTRAP_API_TOKEN);

  if (!email) {
    return res.status(400).json({ message: "Email wajib diisi" });
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    return res.json({
      message: "Jika email terdaftar, link reset akan dikirim.",
    });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: token,
      resetPasswordExp: expiry,
    },
  });

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  // ✅ GANTI SENDMAIL DENGAN MAILTRAP API
const response = await fetch("https://send.api.mailtrap.io/api/send", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.MAILTRAP_API_TOKEN}`,
    "Content-Type": "application/json",
    "X-MT-Stream": "outbound", // 🔥 WAJIB
  },
  body: JSON.stringify({
    from: {
      email: "no-reply@demomailtrap.co",
      name: "HRIS Support",
    },
    to: [{ email: "allyssasoray18@gmail.com" }],
    subject: "Reset Password",
    html: `
      <p>Halo,</p>
      <p>Kami menerima permintaan untuk mengganti password akun Anda.</p>
      <p>
        <a href="${resetLink}">
          Klik link ini untuk mengganti password
        </a>
      </p>
      <p>Link ini berlaku selama 15 menit.</p>
    `,
  }),
});


 if (!response.ok) {
  const errorText = await response.text();
  console.error("MAILTRAP API ERROR:", errorText);

  // ⚠️ jangan bocorkan ke user
  return res.json({
    message: "Jika email terdaftar, link reset akan dikirim.",
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
