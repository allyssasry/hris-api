// src/routes/locationRoutes.js
import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import {
  getLocations,
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
} from "../controllers/locationController.js";

const router = Router();

// All routes require authentication
router.use(auth(true));

// GET /api/locations - Get active locations for checkclock
router.get("/", getLocations);

// GET /api/locations/all - Get all locations (admin only)
router.get("/all", getAllLocations);

// GET /api/locations/:id - Get single location
router.get("/:id", getLocationById);

// POST /api/locations - Create new location (admin only)
router.post("/", createLocation);

// PUT /api/locations/:id - Update location (admin only)
router.put("/:id", updateLocation);

// DELETE /api/locations/:id - Delete location (admin only)
router.delete("/:id", deleteLocation);

export default router;
