// src/routes/googleAuthRoutes.js
import { Router } from "express";
import passport from "passport";
import { generateToken } from "../config/passport.js";
import { prisma } from "../utils/prisma.js";
import { auth } from "../middlewares/auth.js";

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 */
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

/**
 * GET /api/auth/google/callback
 * Google OAuth callback
 */
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${FRONTEND_URL}/auth/sign-in?error=google_auth_failed`,
  }),
  (req, res) => {
    try {
      const user = req.user;

      console.log("\n========== GOOGLE CALLBACK ==========");
      console.log("User:", user?.email);
      console.log("Role:", user?.role);
      console.log("CompanyId:", user?.companyId);
      console.log("isNewUser:", user?.isNewUser);

      if (!user) {
        return res.redirect(`${FRONTEND_URL}/auth/sign-in?error=no_user`);
      }

      // Generate JWT token
      const token = generateToken(user);

      // Check if user needs company setup:
      // - New user (isNewUser = true)
      // - OR existing user without company (companyId = null)
      const needsCompanySetup = user.isNewUser || !user.companyId;
      
      console.log("needsCompanySetup:", needsCompanySetup);
      console.log("======================================\n");

      // Redirect to frontend with token
      res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
        avatar: user.avatar,
        needsCompanySetup: needsCompanySetup,
      }))}`);
    } catch (error) {
      console.error("Google callback error:", error);
      res.redirect(`${FRONTEND_URL}/auth/sign-in?error=callback_error`);
    }
  }
);

/**
 * POST /api/auth/setup-company
 * Setup company for Google OAuth users
 */
router.post("/setup-company", auth(), async (req, res) => {
  try {
    const { companyName } = req.body;
    const userId = req.user.id;

    if (!companyName || !companyName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Company name is required",
      });
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user already has a company
    if (user.companyId) {
      return res.status(400).json({
        success: false,
        message: "User already has a company",
      });
    }

    // Create company and update user
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create company
      const company = await tx.company.create({
        data: {
          name: companyName.trim(),
          ownerId: userId,
        },
      });

      // 2. Update user with companyId
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { companyId: company.id },
      });

      return { company, user: updatedUser };
    });

    // Generate new token with companyId
    const token = generateToken(result.user);

    res.json({
      success: true,
      message: "Company created successfully",
      data: {
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          companyId: result.user.companyId,
          avatar: result.user.avatar,
        },
        company: {
          id: result.company.id,
          name: result.company.name,
        },
      },
    });
  } catch (error) {
    console.error("Setup company error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to setup company",
    });
  }
});

export default router;
