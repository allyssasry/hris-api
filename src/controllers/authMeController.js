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
    // Query employee untuk SEMUA user, karena admin juga bisa punya employee record
    const employeeData = await prisma.employee.findFirst({
      where: { userId: user.id },
      select: {
        avatar: true,
        jobdesk: true, // position/jabatan
        firstName: true,
        lastName: true,
      }
    });

    console.log("🔍 authMe - user:", user);
    console.log("🔍 authMe - employeeData:", employeeData);

    // Gabungkan data - prioritas Employee > User
    const rawAvatar = employeeData?.avatar || user.avatar;
    // Convert avatar path ke full URL
    const avatarUrl = rawAvatar 
      ? (rawAvatar.startsWith('http') ? rawAvatar : `${process.env.BASE_URL || 'http://localhost:4000'}${rawAvatar.startsWith('/') ? '' : '/'}${rawAvatar}`)
      : null;

    // Position logic - prioritas: Employee.jobdesk > User.position > role fallback
    let position = null;
    if (employeeData?.jobdesk) {
      position = employeeData.jobdesk;
    } else if (user.position) {
      position = user.position;
    } else if (user.role === "admin") {
      position = "Admin";
    }
    // Jika masih null, frontend akan fallback ke "Employee" atau "User"

    console.log("🔍 authMe - final position:", position);

    const userData = {
      ...user,
      firstName: employeeData?.firstName || user.firstName,
      lastName: employeeData?.lastName || user.lastName,
      avatarUrl, // ✅ Gunakan avatarUrl dengan full URL
      position,  // ✅ Position dari jobdesk/position/role
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
