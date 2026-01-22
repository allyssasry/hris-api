import { prisma } from '../utils/prisma.js';

export const me = async (req, res) => {
  try {
    // Ambil data user dengan semua field profile
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { 
        id: true, 
        email: true, 
        username: true, 
        firstName: true, 
        lastName: true, 
        role: true,
        companyId: true,
        avatar: true,      // ✅ tambahkan avatar
        position: true,    // ✅ tambahkan position
        phone: true,
      }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Cek jika user punya employee record (untuk dapat position dari jobdesk)
    let employeeData = null;
    if (user.role === "employee" || user.role === "user") {
      employeeData = await prisma.employee.findFirst({
        where: { userId: user.id },
        select: {
          avatar: true,
          jobdesk: true, // position/jabatan
          firstName: true,
          lastName: true,
        }
      });
    }

    // Gabungkan data - prioritas Employee > User
    const userData = {
      ...user,
      firstName: employeeData?.firstName || user.firstName,
      lastName: employeeData?.lastName || user.lastName,
      avatar: employeeData?.avatar || user.avatar,
      position: employeeData?.jobdesk || user.position || (user.role === "admin" ? "Admin" : null),
    };

    res.json({
      success: true,
      data: userData,
      user: userData,
    });
  } catch (err) {
    console.error("ME ERROR:", err);
    res.status(500).json({ message: "Failed to get user data" });
  }
};
