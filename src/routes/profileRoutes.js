import express from "express";
import multer from "multer";
import path from "path";
import { auth } from "../middlewares/auth.js";
import {
  getProfile,
  updateProfile,
  updateAvatar,
  deleteAvatar,
  changePassword,
} from "../controllers/profileController.js";

const router = express.Router();

// ============================================
// MULTER CONFIG untuk Avatar Upload
// ============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/avatars");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `avatar-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Hanya file JPEG dan PNG yang diperbolehkan"), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 }, // 1MB
  fileFilter,
});

// ============================================
// ROUTES
// ============================================

// GET profile
router.get("/", auth(true), getProfile);

// UPDATE profile
router.put("/", auth(true), updateProfile);

// UPDATE avatar
router.put("/avatar", auth(true), upload.single("avatar"), updateAvatar);

// DELETE avatar
router.delete("/avatar", auth(true), deleteAvatar);

// CHANGE password
router.put("/change-password", auth(true), changePassword);

export default router;
