// src/controllers/employeeController.js
import { prisma } from "../utils/prisma.js";
import { sendEmployeeCredentials } from "../services/emailService.js";
import { uploadToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } from "../utils/cloudinary.js";
const NEW_EMPLOYEE_WINDOW_DAYS = 30; // New employee = 1 bulan sejak dibuat

function isNewEmployee(createdAt) {
  const WINDOW = NEW_EMPLOYEE_WINDOW_DAYS * 24 * 60 * 60 * 1000; // 30 hari dalam ms
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
      "permanent",  // Permanen
      "trial",      // Percobaan
      "contract",   // PKWT/Kontrak
      "intern",     // Magang
      "freelance",  // Lepas/Freelance
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
    // Employee ID harus unique PER COMPANY (bukan global)
    const [existingEmployee, existingEmail] = await Promise.all([
      prisma.employee.findFirst({ 
        where: { 
          employeeId,
          companyId  // ✅ Filter by company - Employee ID bisa sama di company berbeda
        } 
      }),
      email ? prisma.user.findUnique({ where: { email } }) : null,
    ]);

    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        message: "Employee ID sudah digunakan di company ini",
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

    // ===================== AVATAR - CLOUDINARY =====================
    let avatarUrl = null;
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(
          req.file.buffer,
          'hris/employees',
          `employee-${employeeId}-${Date.now()}`
        );
        avatarUrl = uploadResult.url;
      } catch (uploadErr) {
        console.error("Cloudinary upload error:", uploadErr);
      }
    }

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
          avatar: avatarUrl,
          userId: user.id,   // 🔗 RELASI
          companyId,
        },
      });

      return { user, employee };
    });

    // ===================== SEND EMAIL CREDENTIALS =====================
    // Get company name for email
    let companyName = "Perusahaan";
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true }
      });
      if (company?.name) {
        companyName = company.name;
      }
    } catch (e) {
      console.log("Could not fetch company name:", e.message);
    }

    // Send email (don't await - do it in background)
    if (email) {
      const employeeName = lastName ? `${firstName} ${lastName}` : firstName;
      
      sendEmployeeCredentials({
        to: email,
        employeeName,
        employeeId,
        email,
        password, // plain password sebelum di-hash
        companyName,
        loginUrl: process.env.FRONTEND_URL 
          ? `${process.env.FRONTEND_URL}/auth/sign-in` 
          : 'http://localhost:5173/auth/sign-in'
      }).then(result => {
        if (result.success) {
          console.log(`✅ Email kredensial terkirim ke ${email}`);
        } else {
          console.log(`⚠️ Gagal kirim email ke ${email}: ${result.error}`);
        }
      });
    }

    return res.status(201).json({
      success: true,
      message: email 
        ? "Employee berhasil dibuat & kredensial dikirim ke email" 
        : "Employee berhasil dibuat & bisa login",
      data: {
        employeeId: result.employee.employeeId,
        userId: result.user.id,
        emailSent: !!email,
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
 * Tambahan: update avatar bila upload foto baru - NOW WITH CLOUDINARY
 */
export async function updateEmployee(req, res) {
  try {
    const { id } = req.params;
    const body = req.body;

    // ⭐ Ambil employee + userId + avatar lama
    const old = await prisma.employee.findUnique({
      where: { id: Number(id) },
      select: {
        avatar: true,
        userId: true,
        employeeId: true,
      },
    });

    if (!old) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // ⭐ Upload new avatar to Cloudinary if provided
    let newAvatar = null;
    if (req.file) {
      try {
        // Delete old avatar from Cloudinary if exists
        if (old.avatar && old.avatar.includes('cloudinary')) {
          const oldPublicId = getPublicIdFromUrl(old.avatar);
          if (oldPublicId) {
            await deleteFromCloudinary(oldPublicId);
          }
        }
        
        const uploadResult = await uploadToCloudinary(
          req.file.buffer,
          'hris/employees',
          `employee-${old.employeeId}-${Date.now()}`
        );
        newAvatar = uploadResult.url;
      } catch (uploadErr) {
        console.error("Cloudinary upload error:", uploadErr);
      }
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
  "permanent",  // Permanen
  "trial",      // Percobaan
  "contract",   // PKWT/Kontrak
  "intern",     // Magang
  "freelance",  // Lepas/Freelance
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
    const employeeId = Number(id);

    // Cari employee dulu untuk validasi
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        EmployeeCredential: true,
        checkClocks: true,
      },
    });

    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        error: "Employee not found" 
      });
    }

    // Hapus dalam transaction agar konsisten
    await prisma.$transaction(async (tx) => {
      // 1. Hapus semua CheckClock terkait employee
      if (employee.checkClocks.length > 0) {
        await tx.checkClock.deleteMany({
          where: { employeeId: employeeId },
        });
      }

      // 2. Hapus EmployeeCredential (sudah punya onDelete: Cascade, tapi jaga-jaga)
      if (employee.EmployeeCredential.length > 0) {
        await tx.employeeCredential.deleteMany({
          where: { employeeId: employeeId },
        });
      }

      // 3. Hapus Employee
      await tx.employee.delete({
        where: { id: employeeId },
      });
    });

    res.json({ success: true, status: "success", message: "Employee deleted" });
  } catch (err) {
    console.error("Error deleting employee:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to delete employee",
      details: err.message 
    });
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

    // Get old employee data for avatar cleanup
    const oldEmployee = await prisma.employee.findUnique({
      where: { id: Number(id) },
      select: { avatar: true, employeeId: true },
    });

    // Delete old avatar from Cloudinary if exists
    if (oldEmployee?.avatar && oldEmployee.avatar.includes('cloudinary')) {
      const oldPublicId = getPublicIdFromUrl(oldEmployee.avatar);
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId);
      }
    }

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(
      req.file.buffer,
      'hris/employees',
      `employee-${oldEmployee?.employeeId || id}-${Date.now()}`
    );

    const updated = await prisma.employee.update({
      where: { id: Number(id) },
      data: { avatar: uploadResult.url },
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
      message: "Failed to upload avatar: " + err.message,
    });
  }
}

/**
 * GET /api/employees/stats
 * Selaras dengan logic di adminDashboardController.js
 */
export async function getEmployeeStats(req, res) {
  try {
    const { companyId } = req.user;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Company belum diset untuk user ini",
      });
    }

    // Use Prisma count for accurate stats (same as dashboard)
    const [total, active, past, newCount] = await Promise.all([
      // Total employees
      prisma.employee.count({
        where: { companyId }
      }),
      // Active employees (isActive = true AND terminationType = null)
      prisma.employee.count({
        where: {
          companyId,
          isActive: true,
          terminationType: null
        }
      }),
      // Past employees (terminated/resigned OR inactive)
      prisma.employee.count({
        where: {
          companyId,
          OR: [
            { terminationType: { not: null } },
            { isActive: false }
          ]
        }
      }),
      // New employees (created within 30 days)
      prisma.employee.count({
        where: {
          companyId,
          createdAt: {
            gte: new Date(Date.now() - NEW_EMPLOYEE_WINDOW_DAYS * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    // Status distribution (for active employees only)
    const [permanent, contract, intern] = await Promise.all([
      prisma.employee.count({
        where: { companyId, contractType: "permanent", isActive: true, terminationType: null }
      }),
      prisma.employee.count({
        where: { companyId, contractType: "contract", isActive: true, terminationType: null }
      }),
      prisma.employee.count({
        where: { companyId, contractType: "intern", isActive: true, terminationType: null }
      })
    ]);

    const stats = {
      total,
      new: newCount,
      active,
      past
    };

    const statusDistribution = {
      permanent,
      contract,
      intern
    };

    console.log('===== EMPLOYEE STATS =====');
    console.log('Company ID:', companyId);
    console.log('Stats:', stats);

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

/**
 * GET /api/employees/me
 * Ambil profile employee yang sedang login
 */
export async function getMyEmployee(req, res) {
  try {
      console.log("USER:", req.user); // 🔥 DEBUG

    const { employeeId } = req.user;

    if (!employeeId) {
      return res.status(403).json({
        success: false,
        message: "Employee only",
      });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobdesk: true,
        avatar: true,
      },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.json({
      success: true,
      data: employee,
    });
  } catch (err) {
    console.error("getMyEmployee error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
}

/**
 * PATCH /api/employees/:id/toggle-status
 * Toggle status aktif/nonaktif employee (sementara)
 */
export async function toggleEmployeeStatus(req, res) {
  try {
    const { id } = req.params;
    const { companyId, role } = req.user;

    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin only",
      });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: Number(id) },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    if (employee.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden access",
      });
    }

    // Jika sudah terminated/resign, tidak bisa toggle
    if (employee.terminationType) {
      return res.status(400).json({
        success: false,
        message: "Employee sudah di-terminate/resign, tidak bisa toggle status",
      });
    }

    const updated = await prisma.employee.update({
      where: { id: Number(id) },
      data: { isActive: !employee.isActive },
    });

    return res.json({
      success: true,
      message: updated.isActive ? "Employee diaktifkan" : "Employee dinonaktifkan",
      data: { id: updated.id, isActive: updated.isActive },
    });
  } catch (err) {
    console.error("toggleEmployeeStatus error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle employee status",
    });
  }
}

/**
 * PATCH /api/employees/:id/terminate
 * Terminate employee (PHK/Resign) - permanen
 */
export async function terminateEmployee(req, res) {
  try {
    const { id } = req.params;
    const { type } = req.body; // resign | terminated
    const { companyId, role } = req.user;

    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin only",
      });
    }

    if (!type || !["resign", "terminated"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type harus 'resign' atau 'terminated'",
      });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: Number(id) },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    if (employee.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden access",
      });
    }

    if (employee.terminationType) {
      return res.status(400).json({
        success: false,
        message: `Employee sudah di-${employee.terminationType}`,
      });
    }

    const updated = await prisma.employee.update({
      where: { id: Number(id) },
      data: {
        isActive: false,
        terminationType: type,
        terminatedAt: new Date(),
      },
    });

    return res.json({
      success: true,
      message: type === "resign" ? "Employee telah diresignkan" : "Employee telah di-terminate (PHK)",
      data: {
        id: updated.id,
        isActive: updated.isActive,
        terminationType: updated.terminationType,
        terminatedAt: updated.terminatedAt,
      },
    });
  } catch (err) {
    console.error("terminateEmployee error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to terminate employee",
    });
  }
}
