// src/routes/userCheckclockRoutes.js
import { Router } from "express";
import multer from "multer";
import { auth, requireEmployee } from "../middlewares/auth.js";
import {
  listUserCheckclocks,
  createUserCheckclock,
  getUserAttendanceSummary,
  getUserWorkHours,
  getUserLeaveSummary,
} from "../controllers/UserCheckclockController.js";

const r = Router();

/* ================= MULTER - Memory Storage for Cloudinary ================= */
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Hanya file gambar yang diperbolehkan"), false);
    }
  }
});

/* ============================================================
   ======================= ROUTES =============================
   ============================================================ */

/* ================= LIST CHECKCLOCK =================
   GET /api/user/check-clocks/me
   ================================================ */
r.get(
  "/check-clocks/me",
  auth(true),
  requireEmployee,
  listUserCheckclocks
);

/* ================= CREATE CHECKCLOCK =================
   POST /api/user/check-clocks
   ================================================ */
r.post(
  "/check-clocks",
  auth(true),
  requireEmployee,
  upload.single("proof"),
  createUserCheckclock
);

/* ================= ATTENDANCE SUMMARY =================
   GET /api/user/check-clocks/summary?month=YYYY-MM
   ================================================ */
r.get(
  "/check-clocks/summary",
  auth(true),
  requireEmployee,
  getUserAttendanceSummary
);

/* ================= WORK HOURS SUMMARY =================
   GET /api/user/work-hours?month=YYYY-MM
   ================================================ */
r.get(
  "/work-hours",
  auth(true),
  requireEmployee,
  getUserWorkHours
);

/* ================= LEAVE SUMMARY =================
   GET /api/user/leave/summary?month=YYYY-MM
   ================================================ */
r.get(
  "/leave/summary",
  auth(true),
  requireEmployee,
  getUserLeaveSummary
);

export default r;
