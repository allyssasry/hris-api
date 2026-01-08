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

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role, // ← penting 
      companyId: user.companyId,
    },
  });
};

/* ============================================================
   ==============       SIGN UP (MANUAL)       ================
   ============================================================ */
export async function signUp(req, res) {
  try {
    const { firstName, lastName, email, username, password } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({
        success: false,
        message: "Email, username, dan password wajib diisi.",
      });
    }

    // cek apakah email atau username sudah dipakai
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email atau username sudah digunakan.",
      });
    }

    // ⭐ ATURAN UTAMA: semua user yang sign-up = ADMIN
    const userRole = "admin";

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        username,
        password: hashedPassword,
        role: userRole,
      },
    });

    return res.status(201).json({
      message: "Sign up berhasil!",
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role, // pasti admin
        companyId: user.companyId,
      },
    });
  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat sign up.",
      error: err.message,
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
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
  // 🔥 LOG EMPLOYEE LOGIN
    console.log("\n=============== EMPLOYEE LOGIN ===============");
    console.log({
      userId: employee.User.id,
      employeeId: employee.employeeId,
      name: `${employee.firstName} ${employee.lastName || ""}`,
      role: "employee",
      companyId: company.id,
    });
    console.log("=============================================\n");
    return res.json({
      success: true,
      message: "Login employee berhasil",
      token,
      user: {
        id: employee.User.id,
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName || ""}`.trim(),
        role: "employee",
        companyId: company.id,
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
