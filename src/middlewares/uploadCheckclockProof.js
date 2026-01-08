// middlewares/uploadCheckclockProof.js
import multer from "multer";
import path from "path";
import fs from "fs";

const dest = path.join(process.cwd(), "uploads", "checkclock-proofs");
fs.mkdirSync(dest, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dest),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const name = path.basename(file.originalname || "proof", ext);
    cb(null, `${name}-${Date.now()}${ext}`);
  },
});

export const uploadCheckclockProof = multer({ storage }).single("proof");
