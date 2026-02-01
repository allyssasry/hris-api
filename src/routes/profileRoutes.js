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
// MULTER CONFIG untuk Avatar Upload - MEMORY STORAGE for Cloudinary
// ============================================
const storage = multer.memoryStorage(); // Use memory storage for Cloudinary upload

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Hanya file JPEG, PNG, dan WebP yang diperbolehkan"), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for Cloudinary
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
