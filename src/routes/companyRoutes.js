import express from "express";
import { setupCompany, getMyCompany } from "../controllers/companyController.js";
import { auth } from "../middlewares/auth.js";

const router = express.Router();

router.post("/setup", auth(), setupCompany);
router.get("/me", auth(), getMyCompany); // ⭐ INI WAJIB

export default router;
