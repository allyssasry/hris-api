import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma.js';
import { googleTokenSchema } from '../validators/authSchemas.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ===== Fungsi untuk membuat JWT =====
function issueJWT(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ===== Controller utama =====
export const googleSignIn = async (req, res) => {
  // Validasi body request (pakai Zod)
  const parse = googleTokenSchema.safeParse(req.body);
  if (!parse.success)
    return res.status(400).json({ errors: parse.error.flatten() });

  const { id_token } = parse.data;

  // ===== Verifikasi token Google =====
  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch {
    return res.status(401).json({ message: 'Token Google tidak valid' });
  }

  // ===== Ambil data payload dari token =====
  const payload = ticket.getPayload(); // berisi sub, email, email_verified, name, given_name, family_name
  const sub = payload.sub;
  const email = payload.email?.toLowerCase();

  // ✅ Tambahkan validasi email verified
  if (payload.email && payload.email_verified === false) {
    return res
      .status(400)
      .json({ message: 'Email Google belum terverifikasi' });
  }

  try {
    // ===== Cek apakah akun Google ini sudah pernah login =====
    let account = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId: sub,
        },
      },
      include: { user: true },
    });

    // Kalau sudah ada → langsung login
    if (account) {
      const token = issueJWT(account.user);
      return res.json({
        token,
        user: {
          id: account.user.id,
          email: account.user.email,
          firstName: account.user.firstName,
          lastName: account.user.lastName,
        },
      });
    }

    // ===== Kalau belum ada → cek user berdasarkan email =====
    let user = email
      ? await prisma.user.findUnique({ where: { email } })
      : null;

    // Kalau belum ada user sama sekali → buat user baru
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email || `google_${sub}@noemail.local`,
          firstName: payload.given_name || payload.name || 'User',
          lastName: payload.family_name || null,
        },
      });
    }

    // ===== Buat relasi OAuthAccount untuk user ini =====
    await prisma.oAuthAccount.create({
      data: {
        userId: user.id,
        provider: 'google',
        providerAccountId: sub,
        email,
      },
    });

    // ===== Terbitkan JWT & kirim respon =====
    const token = issueJWT(user);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (err) {
    console.error('Google sign-in error:', err);
    res
      .status(500)
      .json({ message: 'Terjadi kesalahan saat login dengan Google' });
  }
};
