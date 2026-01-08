// src/middlewares/auth.js
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma.js";

/**
 * AUTH MIDDLEWARE
 * - Validasi JWT
 * - Ambil user dari DB
 * - Jika role employee → inject employeeId
 */
export function auth(required = true) {
  return async (req, res, next) => {
    try {
      console.log("\n=========== AUTH MIDDLEWARE ===========");
      console.log("➡️ URL:", req.method, req.originalUrl);
      console.log("➡️ AUTH HEADER:", req.headers.authorization);

      /* ================= TOKEN ================= */
      const header = req.headers.authorization || "";
      const token = header.startsWith("Bearer ")
        ? header.slice(7).trim()
        : null;

      if (!token) {
        console.log("❌ TOKEN MISSING");
        if (!required) return next();
        return res.status(401).json({
          message: "Unauthorized: Token missing",
        });
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error("❌ JWT_SECRET missing!");
        return res.status(500).json({
          message: "Server misconfiguration",
        });
      }

      /* ================= VERIFY JWT ================= */
      const decoded = jwt.verify(token, secret);
      console.log("🔑 DECODED TOKEN:", decoded);

      /* ================= USER ================= */
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          role: true,
          companyId: true,
        },
      });

      if (!user) {
        console.log("❌ USER NOT FOUND");
        return res.status(401).json({
          message: "User not found",
        });
      }

      /* ================= EMPLOYEE ================= */
      let employeeId = null;

      if (user.role === "employee") {
        const employee = await prisma.employee.findFirst({
          where: { userId: user.id },
          select: { id: true },
        });

        if (!employee) {
          console.log("❌ EMPLOYEE PROFILE NOT FOUND");
          return res.status(401).json({
            message: "Employee profile not found",
          });
        }

        employeeId = employee.id;
      }

      /* ================= INJECT CONTEXT ================= */
      req.user = {
        id: user.id,
        role: user.role,
        companyId: user.companyId,
        employeeId, // ⭐ PENTING
      };

      console.log("✅ AUTH CONTEXT:", req.user);
      console.log("======================================\n");

      next();
    } catch (err) {
      console.error("❌ AUTH ERROR:", err.message);
      if (!required) return next();
      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }
  };
}

/* ================= ADMIN GUARD ================= */
export function requireAdmin(req, res, next) {
  if (req.user?.role === "admin") return next();

  return res.status(403).json({
    message: "Admin only",
  });
}

/* ================= EMPLOYEE GUARD ================= */
export function requireEmployee(req, res, next) {
  console.log("ROLE:", req.user?.role);
  console.log("EMPLOYEE ID:", req.user?.employeeId);

  if (!req.user?.employeeId) {
    return res.status(403).json({ message: "Employee only" });
  }
  next();
}

