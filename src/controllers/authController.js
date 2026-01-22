// src/controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma.js";
import {
  signUpSchema,
  signInSchema,
  employeeSignInSchema,
} from "../validators/authSchemas.js";

/* ===================== JWT GENERATOR ===================== */
function issueJWT(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role, // ← IMPORTAN: pakai role
          companyId: user.companyId, // ⭐ KUNCI MULTI-COMPANY
},
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/* ============================================================
   ==============       SIGN IN (MANUAL)       ================
   ============================================================ */
export const signIn = async (req, res) => {
  const parsed = signInSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(422).json({
      message: "validation error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const { identifier, password } = parsed.data;

  // boleh login pakai email atau username
  const ors = identifier.includes("@")
    ? [{ email: identifier.toLowerCase() }]
    : [{ username: identifier }];

  let user = await prisma.user.findFirst({ where: { OR: ors } });

  if (!user || !user.password) {
    return res.status(401).json({ message: "kredensial salah" });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: "kredensial salah" });

  const token = issueJWT(user);

  // Cek jika user punya employee record (untuk dapat avatar dan position)
  let employeeData = null;
  if (user.role === "employee" || user.role === "user") {
    employeeData = await prisma.employee.findFirst({
      where: { userId: user.id },
      select: {
        avatar: true,
        jobdesk: true,
        firstName: true,
        lastName: true,
      }
    });
  }

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: employeeData?.firstName || user.firstName,
      lastName: employeeData?.lastName || user.lastName,
      role: user.role,
      companyId: user.companyId,
      avatar: employeeData?.avatar || user.avatar,
      position: employeeData?.jobdesk || user.position || (user.role === "admin" ? "Admin" : null),
    },
  });
};

/* ============================================================
   ==============       SIGN UP (MANUAL)       ================
   ============================================================ */
export async function signUp(req, res) {
  try {
    // ✅ Sesuai dengan frontend SignUp.jsx
    const { firstName, lastName, email, password, companyName } = req.body;

    // Validasi field wajib (sesuai frontend)
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, email, dan password wajib diisi.",
      });
    }

    // Validasi email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Format email tidak valid.",
      });
    }

    // Validasi password minimal 8 karakter (sesuai frontend)
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password minimal 8 karakter.",
      });
    }

    // Cek apakah email sudah dipakai
    const existingUser = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email sudah terdaftar. Silakan gunakan email lain atau login.",
      });
    }

    // Auto-generate username dari email (ambil bagian sebelum @)
    let baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    let username = baseUsername;
    let counter = 1;
    
    // Pastikan username unik
    while (await prisma.user.findFirst({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ⭐ ATURAN UTAMA: semua user yang sign-up via form = ADMIN
    const userRole = "admin";

    // Buat user dan company dalam transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Buat User terlebih dahulu
      const user = await tx.user.create({
        data: {
          firstName,
          lastName,
          email: email.toLowerCase(),
          username,
          password: hashedPassword,
          role: userRole,
        },
      });

      let company = null;

      // 2. Jika companyName diisi, buat Company dan hubungkan
      if (companyName && companyName.trim()) {
        company = await tx.company.create({
          data: {
            name: companyName.trim(),
            ownerId: user.id, // User ini jadi owner company
          },
        });

        // 3. Update user dengan companyId
        await tx.user.update({
          where: { id: user.id },
          data: { companyId: company.id },
        });
      }

      return { user, company };
    });

    return res.status(201).json({
      success: true,
      message: "Sign up berhasil! Silakan login.",
      data: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        companyId: result.company?.id || null,
        companyName: result.company?.name || null,
      },
    });
  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat sign up. Silakan coba lagi.",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/* ============================================================
   ==============    SIGN IN EMPLOYEE (USER)   ================
   ============================================================ */
export async function employeeSignIn(req, res) {
  try {
    const { companyUser, employeeId, password } = req.body;

    if (!companyUser || !employeeId || !password) {
      return res.status(400).json({
        success: false,
        message: "Company, Employee ID, dan password wajib diisi",
      });
    }

    const company = await prisma.company.findFirst({
      where: { name: companyUser },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company tidak ditemukan",
      });
    }

    const employee = await prisma.employee.findFirst({
      where: {
        employeeId: String(employeeId),
        companyId: company.id,
      },
      include: { User: true },
    });

    if (!employee || !employee.User) {
      return res.status(404).json({
        success: false,
        message: "Employee ID tidak ditemukan",
      });
    }

    const isValid = await bcrypt.compare(
      password,
      employee.User.password
    );

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Password salah",
      });
    }

    // 🔒 PAKSA ROLE EMPLOYEE
    const token = jwt.sign(
      {
        id: employee.User.id,
        role: "employee",
        companyId: company.id,
        employeeId: employee.id, // ⭐ TAMBAHKAN INI
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.cookie("token", token, {
  httpOnly: true,
  sameSite: "lax",
  secure: false,
  maxAge: 24 * 60 * 60 * 1000,
});
  // 🔥 LOG EMPLOYEE LOGIN
    console.log("\n=============== EMPLOYEE LOGIN ===============");
    console.log({
      userId: employee.User.id,
      employeeId: employee.employeeId,
      name: `${employee.firstName} ${employee.lastName || ""}`,
      role: "employee",
      companyId: company.id,
      position: employee.jobdesk,
      avatar: employee.avatar,
    });
    console.log("=============================================\n");
    return res.json({
      success: true,
      message: "Login employee berhasil",
      token,
      user: {
        id: employee.User.id,
        employeeId: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        name: `${employee.firstName} ${employee.lastName || ""}`.trim(),
        role: "employee",
        companyId: company.id,
        avatar: employee.avatar || employee.User.avatar,
        position: employee.jobdesk || employee.User.position,
      },
    });
  } catch (err) {
    console.error("EMPLOYEE SIGNIN ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Login employee gagal",
    });
  }
}

/* ============================================================
   ==============     GOOGLE SIGN IN (ADMIN)    ================
   ============================================================ */
// Jika kamu punya googleAuthController.js, pindahkan kode ini ke sana.
// Untuk sekarang aku taruh minimal version di sini:

export async function googleSignIn(req, res) {
  try {
    const { email, firstName, lastName, username } = req.body;

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // ⭐ Google login juga selalu ADMIN
      user = await prisma.user.create({
        data: {
          email,
          username,
          firstName,
          lastName,
          role: "admin",
        },
      });
    } else if (user.role !== "admin") {
      // update jadi admin kalau sebelumnya user
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: "admin" },
      });
    }

    const token = issueJWT(user);

    return res.json({
      ok: true,
      token,
      user,
    });
  } catch (error) {
    console.error("GOOGLE SIGNIN ERROR", error);
    return res.status(500).json({ ok: false, message: "Google Sign In gagal" });
  }
}
