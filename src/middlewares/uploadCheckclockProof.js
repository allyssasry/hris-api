// middlewares/uploadCheckclockProof.js
import multer from "multer";

// Use memory storage for Cloudinary uploads
const storage = multer.memoryStorage();

export const uploadCheckclockProof = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Hanya file gambar yang diperbolehkan"), false);
    }
  }
}).single("proof");
