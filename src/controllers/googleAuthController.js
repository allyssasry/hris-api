// src/controllers/googleAuthController.js
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma.js";
import { googleTokenSchema } from "../validators/authSchemas.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/* ===================== JWT HELPER ===================== */
function issueJWT(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,   // ✔ gunakan role
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/* ===================== GOOGLE SIGN IN ===================== */
export const googleSignIn = async (req, res) => {
  try {
    // Validasi token google
    const parsed = googleTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Validation error",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const idToken = parsed.data.idToken || parsed.data.credential;

    // Verifikasi token Google
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      return res.status(401).json({ message: "Google tidak menyediakan email" });
    }

    const email = payload.email.toLowerCase();

    let user = await prisma.user.findUnique({
      where: { email },
      include: { accounts: true },
    });

    /* =======================================================
       1️⃣  USER BARU → langsung jadi ADMIN
       ======================================================= */
    if (!user) {
      const firstName =
        payload.given_name || payload.name?.split(" ")[0] || null;
      const lastName = payload.family_name || null;

      user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          username: email.split("@")[0],
          role: "admin", // ⭐ google signup = admin
        },
      });

      await prisma.oAuthAccount.create({
        data: {
          userId: user.id,
          provider: "google",
          providerAccountId: payload.sub,
          email,
        },
      });
    }

    /* =======================================================
       2️⃣  USER LAMA → jadikan admin kalau belum admin
       ======================================================= */
    else {
      // pastikan akun google tercatat
      const hasGoogle = user.accounts.some(
        (acc) =>
          acc.provider === "google" &&
          acc.providerAccountId === payload.sub
      );

      if (!hasGoogle) {
        await prisma.oAuthAccount.create({
          data: {
            userId: user.id,
            provider: "google",
            providerAccountId: payload.sub,
            email,
          },
        });
      }

      // ⭐ pastikan admin
      if (user.role !== "admin") {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: "admin" },
        });
      }
    }

    /* =======================================================
       3️⃣  ISSUE JWT
       ======================================================= */
    const token = issueJWT(user);

    // Cek jika user punya employee record
    const employeeData = await prisma.employee.findFirst({
      where: { userId: user.id },
      select: {
        avatar: true,
        jobdesk: true,
        firstName: true,
        lastName: true,
      }
    });

    // Avatar URL - prioritas Google avatar > employee > user
    const rawAvatar = employeeData?.avatar || user.avatar || payload.picture;
    const avatarUrl = rawAvatar 
      ? (rawAvatar.startsWith('http') ? rawAvatar : `${process.env.BASE_URL || 'http://localhost:4000'}${rawAvatar.startsWith('/') ? '' : '/'}${rawAvatar}`)
      : null;

    // Position logic
    let position = null;
    if (employeeData?.jobdesk) {
      position = employeeData.jobdesk;
    } else if (user.position) {
      position = user.position;
    } else if (user.role === "admin") {
      position = "Admin";
    }

    return res.json({
      ok: true,
      message: "Google Sign In Success",
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: employeeData?.firstName || user.firstName,
        lastName: employeeData?.lastName || user.lastName,
        role: user.role,
        avatarUrl, // ✅ Full URL
        position,  // ✅ Position
      },
    });
  } catch (err) {
    console.error("GOOGLE SIGN-IN ERROR:", err);
    return res.status(500).json({ message: "Google Auth Error" });
  }
};
