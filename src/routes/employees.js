import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import {
  getEmployees,
  getEmployeeStats,
  createEmployee,
  updateEmployee,
  getEmployeeById,
  deleteEmployee,
  updateAvatar,
  
} from "../controllers/employeeController.js";

import { upload } from "../utils/upload.js";

const r = Router();

/* ===========================
      EMPLOYEE ROUTES
=========================== */

// ✅ STATS — HARUS PALING ATAS
r.get("/stats", auth(true), getEmployeeStats);

// LIST
r.get("/", auth(true), getEmployees);

// DETAIL
r.get("/:id", auth(true), getEmployeeById);

// CRUD
r.post("/", auth(true), upload.single("avatar"), createEmployee);
r.put("/:id", auth(true), upload.single("avatar"), updateEmployee);
r.delete("/:id", auth(true), deleteEmployee);

// AVATAR (opsional)
r.put("/:id/avatar", auth(true), upload.single("avatar"), updateAvatar);

export default r;
