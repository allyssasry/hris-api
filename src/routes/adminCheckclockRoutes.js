import { Router } from "express";
import multer from "multer";
import { auth, requireAdmin } from "../middlewares/auth.js";
import {
  createAdminCheckclock,
  listAdminCheckclocks,
  approveAdminCheckclock,
  getAdminCheckclockDetail,
  getAttendanceStats,
  getAttendanceTable
} from "../controllers/adminCheckclockController.js";

const router = Router();

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

/* ================= ROUTES ================= */

// ⭐ stats (HARUS DI ATAS)
router.get(
  "/attendance/stats",
  auth(true),
  requireAdmin,
  getAttendanceStats
);

// ⭐ table
router.get(
  "/attendance/table",
  auth(true),
  requireAdmin,
  getAttendanceTable
);

// GET → list
router.get(
  "/",
  auth(true),
  requireAdmin,
  listAdminCheckclocks
);

// GET → DETAIL (🔥 INI YANG HILANG)
router.get(
  "/:id",
  auth(true),
  requireAdmin,
  getAdminCheckclockDetail
);

// POST → create
router.post(
  "/",
  auth(true),
  requireAdmin,
  upload.single("proof"),
  createAdminCheckclock
);

// PATCH → approve / reject
router.patch(
  "/:id/approve",
  auth(true),
  requireAdmin,
  approveAdminCheckclock
);

export default router;
