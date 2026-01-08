// src/controllers/employeeController.js
import { prisma } from "../utils/prisma.js";
const NEW_EMPLOYEE_WINDOW_HOURS = 24; // tinggal ganti angka

function isNewEmployee(createdAt) {
  const WINDOW = NEW_EMPLOYEE_WINDOW_HOURS * 60 * 60 * 1000;
  return Date.now() - new Date(createdAt).getTime() <= WINDOW;
}


export async function getEmployees(req, res) {
  try {
    const { month, year } = req.query;
    const { companyId } = req.user; // 🔑 dari JWT

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Company belum diset untuk user ini",
      });
    }

    // ✅ FILTER WAJIB BY COMPANY
    const where = {
      companyId,
    };

    // ✅ FILTER BULAN (OPSIONAL)
    if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 1);

      where.createdAt = {
        gte: startDate,
        lt: endDate,
      };
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        User: {
          select: {
            email: true,
            username: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const data = employees.map((emp) => ({
      ...emp,
      companyName: emp.company?.name || null, // ⭐ INI KUNCI
      isNew: isNewEmployee(emp.createdAt),
    }));

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Error getEmployees:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch employees",
    });
  }
}



/**
 * GET /api/employees/:id
 */
export async function getEmployeeById(req, res) {
  try {
    const { id } = req.params;
    const { companyId } = req.user; // 🔑 dari JWT

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Company belum diset untuk user ini",
      });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: Number(id) },
      include: {
        User: {
          select: {
            email: true,
            username: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // 🔒 KUNCI MULTI COMPANY
    if (employee.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden access",
      });
    }

    return res.json({
      success: true,
      data: {
        ...employee,
        companyName: employee.company.name, // ⭐
      },
    });
  } catch (err) {
    console.error("Error getEmployeeById:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch employee detail",
    });
  }
}


/**
 * POST /api/employees
 * Tambahan: avatar dari req.file
 */
export async function createEmployee(req, res) {
  try {
    const { companyId, role } = req.user; // 🔑 dari JWT (admin)

    // 🔒 HANYA ADMIN
    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin only",
      });
    }

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Company belum diset untuk user ini",
      });
    }

    const {
      employeeId,
      firstName,
      lastName,
      mobileNumber,
      nik,
      gender,
      birthDate,
      jobdesk,
      branch,
      contractType,
      grade,
      bank,
      accountName,
      accountNumber,
      spType,
      education,
      password,
      email,
    } = req.body;

    // ===================== VALIDASI WAJIB =====================
    if (!employeeId || !firstName || !password) {
      return res.status(400).json({
        success: false,
        message: "employeeId, firstName, dan password wajib diisi",
      });
    }

    const ALLOWED_EDUCATION = ["sma", "smk", "d3", "s1", "s2", "s3"];
    const ALLOWED_CONTRACT_TYPES = [
      "permanent",
      "contract",
      "intern",
      "resign",
    ];

    if (education && !ALLOWED_EDUCATION.includes(education)) {
      return res.status(400).json({
        success: false,
        message: "Pendidikan tidak valid",
      });
    }

    if (contractType && !ALLOWED_CONTRACT_TYPES.includes(contractType)) {
      return res.status(400).json({
        success: false,
        message: "Tipe kerja tidak valid",
      });
    }

    // ===================== CEK DUPLIKASI =====================
    const [existingEmployee, existingEmail] = await Promise.all([
      prisma.employee.findUnique({ where: { employeeId } }),
      email ? prisma.user.findUnique({ where: { email } }) : null,
    ]);

    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        message: "Employee ID sudah digunakan",
      });
    }

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "Email sudah terdaftar",
      });
    }

    // ===================== HASH PASSWORD =====================
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    // ===================== AVATAR =====================
    const avatarPath = req.file ? `/uploads/${req.file.filename}` : null;

    // ===================== TRANSACTION (USER + EMPLOYEE) =====================
    const result = await prisma.$transaction(async (tx) => {
      // 1️⃣ BUAT USER (LOGIN)
      const user = await tx.user.create({
        data: {
          email: email || null,
          password: hashedPassword,
          role: "employee", // ⭐ PENTING
          companyId,
        },
      });

      // 2️⃣ BUAT EMPLOYEE (PROFIL)
      const employee = await tx.employee.create({
        data: {
          employeeId,
          firstName,
          lastName: lastName || null,
          phone: mobileNumber || null,
          nik: nik || null,
          gender: gender || null,
          birthDate: birthDate ? new Date(birthDate) : null,
          jobdesk: jobdesk || null,
          branch: branch || null,
          contractType: contractType || null,
          grade: grade || null,
          bank: bank || null,
          accountName: accountName || null,
          accountNumber: accountNumber || null,
          spType: spType || null,
          education: education || null,
          avatar: avatarPath,
          userId: user.id,   // 🔗 RELASI
          companyId,
        },
      });

      return { user, employee };
    });

    return res.status(201).json({
      success: true,
      message: "Employee berhasil dibuat & bisa login",
      data: {
        employeeId: result.employee.employeeId,
        userId: result.user.id,
      },
    });
  } catch (err) {
    console.error("CREATE EMPLOYEE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create employee",
    });
  }
}

/**
 * PUT /api/employees/:id
 * Tambahan: update avatar bila upload foto baru
 */
export async function updateEmployee(req, res) {
  try {
    const { id } = req.params;
    const body = req.body;

    const newAvatar = req.file ? `/uploads/${req.file.filename}` : null;

    // ⭐ Ambil employee + userId + avatar lama
    const old = await prisma.employee.findUnique({
      where: { id: Number(id) },
      select: {
        avatar: true,
        userId: true,
      },
    });

    if (!old) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // ⭐ Update employee
    const updated = await prisma.employee.update({
      where: { id: Number(id) },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.mobileNumber,
        nik: body.nik,
        gender: body.gender,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        jobdesk: body.jobdesk,
        branch: body.branch,
        contractType: body.contractType,
        grade: body.grade,
        bank: body.bank,
        accountName: body.accountName,
        accountNumber: body.accountNumber,
        spType: body.spType,
            education: body.education, // ⭐ BARU
        avatar: newAvatar || old.avatar,
      },
    });
const ALLOWED_CONTRACT_TYPES = [
  "permanent",
  "contract",
  "intern",   // ⭐ MAGANG
  "resign",
];
if (body.password) {
  const bcrypt = await import("bcryptjs");
  const hashed = await bcrypt.hash(body.password, 10);

  await prisma.user.update({
    where: { id: old.userId },
    data: {
      password: hashed,
    },
  });
}

if (
  body.contractType &&
  !ALLOWED_CONTRACT_TYPES.includes(body.contractType)
) {
  return res.status(400).json({
    success: false,
    message: "Tipe kerja tidak valid",
  });
}

    // ⭐ Update email di tabel USER
    if (body.email) {
      await prisma.user.update({
        where: { id: old.userId },
        data: { email: body.email },
      });
    }

    return res.json({
      success: true,
      message: "Employee updated",
      data: updated,
    });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update employee",
    });
  }
}


/**
 * DELETE /api/employees/:id
 */
export async function deleteEmployee(req, res) {
  try {
    const { id } = req.params;

    await prisma.employee.delete({
      where: { id: Number(id) },
    });

    res.json({ status: "success", message: "Employee deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete employee" });
  }
}
export async function updateAvatar(req, res) {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const avatarPath = `/uploads/${req.file.filename}`;

    const updated = await prisma.employee.update({
      where: { id: Number(id) },
      data: { avatar: avatarPath },
    });

    return res.json({
      success: true,
      message: "Avatar updated",
      data: updated,
    });
  } catch (err) {
    console.error("Avatar upload error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to upload avatar",
    });
  }
}

/**
 * GET /api/employees/stats
 */
export async function getEmployeeStats(req, res) {
  try {
    const { month, year } = req.query;

    const where = {};

    if (month && year) {
      where.createdAt = {
        gte: new Date(Number(year), Number(month) - 1, 1),
        lt: new Date(Number(year), Number(month), 1),
      };
    }

    const employees = await prisma.employee.findMany({
      where,
      select: {
        createdAt: true,
        contractType: true,
      },
    });

    const stats = {
      total: employees.length,
      new: 0,
      active: 0,
      resigned: 0,
    };

    const statusDistribution = {
      permanent: 0,
      contract: 0,
      intern: 0,
    };

    employees.forEach((emp) => {
      const type = (emp.contractType || "").toLowerCase();

      // RESIGNED
      if (type === "resign" || type === "terminated") {
        stats.resigned++;
        return;
      }

      // ACTIVE (employee bulan itu)
      stats.active++;

      // ✅ NEW (≤ 24 jam)
      if (isNewEmployee(emp.createdAt)) {
        stats.new++;
      }

      // STATUS DISTRIBUTION
      if (type === "permanent") statusDistribution.permanent++;
      else if (type === "contract") statusDistribution.contract++;
      else if (type === "intern") statusDistribution.intern++;
    });

    return res.json({
      success: true,
      stats,
      statusDistribution,
      lastUpdated: new Date(),
    });
  } catch (err) {
    console.error("Error getEmployeeStats:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch employee stats",
    });
  }
}
