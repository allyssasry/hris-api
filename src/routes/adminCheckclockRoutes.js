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

/* ================= MULTER ================= */
const storage = multer.diskStorage({
  destination: "uploads/checkclock-proofs",
  filename: (_, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

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
