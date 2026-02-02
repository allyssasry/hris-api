import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import { prisma } from "../utils/prisma.js";
import { uploadToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } from "../utils/cloudinary.js";

/**
 * GET /api/profile
 * Ambil data profile user yang sedang login beserta data employee-nya (jika ada)
 */
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Ambil data user dengan semua field profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        nik: true,
        gender: true,
        birthDate: true,
        birthPlace: true,
        education: true,
        bank: true,
        accountName: true,
        accountNumber: true,
        avatar: true,
        position: true,
        role: true,
        companyId: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User tidak ditemukan" 
      });
    }

    // Cari employee data jika ada (untuk user dengan role employee/user)
    let employee = null;
    if (user.role === "employee" || user.role === "user") {
      employee = await prisma.employee.findFirst({
        where: { userId: userId },
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          phone: true,
          nik: true,
          gender: true,
          birthDate: true,
          jobdesk: true,
          branch: true,
          contractType: true,
          grade: true,
          bank: true,
          accountName: true,
          accountNumber: true,
          spType: true,
          education: true,
          avatar: true,
        },
      });
    }

    // Gabungkan data - prioritaskan data dari Employee jika ada, fallback ke User
    const profileData = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      companyId: user.companyId,
      createdAt: user.createdAt,
      // Data profile - prioritas: Employee > User
      firstName: employee?.firstName || user.firstName,
      lastName: employee?.lastName || user.lastName,
      mobileNumber: employee?.phone || user.phone,
      nik: employee?.nik || user.nik,
      gender: employee?.gender || user.gender,
      birthDate: employee?.birthDate || user.birthDate,
      birthPlace: user.birthPlace,
      education: employee?.education || user.education,
      bank: employee?.bank || user.bank,
      accountName: employee?.accountName || user.accountName,
      accountNumber: employee?.accountNumber || user.accountNumber,
      // ✅ avatarUrl dengan full URL
      avatarUrl: (() => {
        const rawAvatar = employee?.avatar || user.avatar;
        if (!rawAvatar) return null;
        const baseUrl = process.env.BASE_URL || 'http://localhost:4000';
        return rawAvatar.startsWith('http') ? rawAvatar : `${baseUrl}${rawAvatar.startsWith('/') ? '' : '/'}${rawAvatar}`;
      })(),
      // Position/role display
      position: employee?.jobdesk || user.position || (user.role === "admin" ? "Admin" : null),
      employeeId: employee?.employeeId || null,
      branch: employee?.branch || null,
      contractType: employee?.contractType || null,
      grade: employee?.grade || null,
    };

    res.json({
      success: true,
      data: profileData,
    });
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);
    res.status(500).json({ 
      success: false, 
      message: "Gagal mengambil data profile" 
    });
  }
};

/**
 * PUT /api/profile
 * Update profile user (dan employee jika ada)
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      firstName,
      lastName,
      mobileNumber,
      nik,
      gender,
      birthDate,
      birthPlace,
      education,
      bank,
      accountName,
      accountNumber,
      position,
    } = req.body;

    // Update user data - SELALU simpan ke tabel User
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        phone: mobileNumber,
        nik,
        gender,
        birthDate: birthDate ? new Date(birthDate) : null,
        birthPlace,
        education,
        bank,
        accountName,
        accountNumber,
        position,
      },
    });

    // Juga update employee record jika ada
    const employee = await prisma.employee.findFirst({
      where: { userId: userId },
    });

    if (employee) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: {
          firstName,
          lastName,
          phone: mobileNumber,
          nik,
          gender,
          birthDate: birthDate ? new Date(birthDate) : null,
          education,
          bank,
          accountName,
          accountNumber,
        },
      });
    }

    // Fetch updated profile data untuk response
    const profileData = {
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role,
      avatar: updatedUser.avatar,
      position: updatedUser.position,
    };

    res.json({
      success: true,
      message: "Profile berhasil diperbarui",
      data: profileData,
    });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ 
      success: false, 
      message: "Gagal memperbarui profile" 
    });
  }
};

/**
 * PUT /api/profile/avatar
 * Upload/update avatar user - NOW USES CLOUDINARY
 */
export const updateAvatar = async (req, res) => {
  console.log("🚀 CLOUDINARY AVATAR UPLOAD V2 - START");
  console.log("📁 req.file:", req.file ? { size: req.file.size, mimetype: req.file.mimetype, hasBuffer: !!req.file.buffer } : "NO FILE");
  
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: "File avatar tidak ditemukan" 
      });
    }
    
    if (!req.file.buffer) {
      console.error("❌ NO BUFFER - Still using diskStorage!");
      return res.status(500).json({ 
        success: false, 
        message: "Server error: file buffer not found. Please contact admin." 
      });
    }

    // Get current user untuk cek avatar lama
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    // Delete old avatar from Cloudinary if exists
    if (user?.avatar && user.avatar.includes('cloudinary')) {
      const oldPublicId = getPublicIdFromUrl(user.avatar);
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId);
      }
    }

    // Upload new avatar to Cloudinary
    const uploadResult = await uploadToCloudinary(
      req.file.buffer,
      'hris/avatars',
      `avatar-${userId}-${Date.now()}`
    );

    const avatarUrl = uploadResult.url;

    // Update avatar di User table dengan Cloudinary URL
    await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });

    // Juga update di Employee jika ada
    const employee = await prisma.employee.findFirst({
      where: { userId: userId },
    });

    if (employee) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: { avatar: avatarUrl },
      });
    }

    res.json({
      success: true,
      message: "Avatar berhasil diperbarui",
      data: { avatarUrl },
    });
  } catch (err) {
    console.error("UPDATE AVATAR ERROR:", err);
    res.status(500).json({ 
      success: false, 
      message: "Gagal memperbarui avatar: " + err.message 
    });
  }
};

/**
 * DELETE /api/profile/avatar
 * Hapus avatar user - NOW USES CLOUDINARY
 */
export const deleteAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user untuk cek avatar
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.avatar) {
      // Delete from Cloudinary if it's a Cloudinary URL
      if (user.avatar.includes('cloudinary')) {
        const publicId = getPublicIdFromUrl(user.avatar);
        if (publicId) {
          await deleteFromCloudinary(publicId);
        }
      }

      // Set avatar ke null di User
      await prisma.user.update({
        where: { id: userId },
        data: { avatar: null },
      });
    }

    // Juga hapus di Employee jika ada
    const employee = await prisma.employee.findFirst({
      where: { userId: userId },
    });

    if (employee?.avatar) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: { avatar: null },
      });
    }

    res.json({
      success: true,
      message: "Avatar berhasil dihapus",
    });
  } catch (err) {
    console.error("DELETE AVATAR ERROR:", err);
    res.status(500).json({ 
      success: false, 
      message: "Gagal menghapus avatar" 
    });
  }
};

/**
 * PUT /api/profile/change-password
 * Ganti password user
 */
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Password lama dan baru wajib diisi",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password baru minimal 6 karakter",
      });
    }

    // Get user dengan password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    // Verifikasi password lama
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: "Password lama tidak sesuai",
      });
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({
      success: true,
      message: "Password berhasil diubah",
    });
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Gagal mengubah password",
    });
  }
};
