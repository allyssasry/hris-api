import { prisma } from "../utils/prisma.js";

export const setupCompany = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id; // 🔑 DARI JWT

    // 1️⃣ Validasi input
    if (!name) {
      return res.status(400).json({
        message: "Company name is required",
      });
    }

    // 2️⃣ Ambil user dari JWT
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // 3️⃣ Cegah double company
    if (user.companyId) {
      return res.status(400).json({
        message: "Company already created",
      });
    }

    // 4️⃣ Buat company
    const company = await prisma.company.create({
      data: {
        name: name.trim(),
        ownerId: user.id,
      },
    });

    // 5️⃣ Assign company ke user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        companyId: company.id,
      },
    });

    return res.status(201).json({
      message: "Company created successfully",
      company: {
        id: company.id,
        name: company.name,
      },
    });
  } catch (error) {
    console.error("SETUP COMPANY ERROR:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export async function getMyCompany(req, res) {
  try {
    
    const { companyId } = req.user;

    if (!companyId) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    return res.json({
      success: true,
      data: company,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to get company",
    });
  }
}

