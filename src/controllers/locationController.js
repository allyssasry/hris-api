// src/controllers/locationController.js
import { prisma } from "../utils/prisma.js";

/**
 * GET /api/locations
 * Get all locations for current user's company
 */
export async function getLocations(req, res) {
  try {
    const { companyId } = req.user;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Company belum diset untuk user ini",
      });
    }

    const locations = await prisma.companyLocation.findMany({
      where: {
        companyId,
        isActive: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return res.json({
      success: true,
      data: locations,
    });
  } catch (err) {
    console.error("Error getLocations:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch locations",
    });
  }
}

/**
 * GET /api/locations/all
 * Get all locations (including inactive) - Admin only
 */
export async function getAllLocations(req, res) {
  try {
    const { companyId, role } = req.user;

    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Hanya admin yang bisa mengakses",
      });
    }

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Company belum diset untuk user ini",
      });
    }

    const locations = await prisma.companyLocation.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
    });

    return res.json({
      success: true,
      data: locations,
    });
  } catch (err) {
    console.error("Error getAllLocations:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch locations",
    });
  }
}

/**
 * GET /api/locations/:id
 * Get single location by ID
 */
export async function getLocationById(req, res) {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Company belum diset untuk user ini",
      });
    }

    const location = await prisma.companyLocation.findUnique({
      where: { id: Number(id) },
    });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    // Check company ownership
    if (location.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden access",
      });
    }

    return res.json({
      success: true,
      data: location,
    });
  } catch (err) {
    console.error("Error getLocationById:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch location",
    });
  }
}

/**
 * POST /api/locations
 * Create new location - Admin only
 */
export async function createLocation(req, res) {
  try {
    const { companyId, role } = req.user;
    const { name, address, latitude, longitude } = req.body;

    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Hanya admin yang bisa menambah lokasi",
      });
    }

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Company belum diset untuk user ini",
      });
    }

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Nama lokasi wajib diisi",
      });
    }

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "Latitude dan longitude wajib diisi",
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: "Latitude dan longitude harus berupa angka",
      });
    }

    // Check duplicate name
    const existing = await prisma.companyLocation.findFirst({
      where: {
        companyId,
        name: name.trim(),
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Lokasi dengan nama tersebut sudah ada",
      });
    }

    const location = await prisma.companyLocation.create({
      data: {
        name: name.trim(),
        address: address?.trim() || null,
        latitude: lat,
        longitude: lng,
        companyId,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Lokasi berhasil ditambahkan",
      data: location,
    });
  } catch (err) {
    console.error("Error createLocation:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create location",
    });
  }
}

/**
 * PUT /api/locations/:id
 * Update location - Admin only
 */
export async function updateLocation(req, res) {
  try {
    const { id } = req.params;
    const { companyId, role } = req.user;
    const { name, address, latitude, longitude, isActive } = req.body;

    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Hanya admin yang bisa mengubah lokasi",
      });
    }

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Company belum diset untuk user ini",
      });
    }

    // Check exists
    const existing = await prisma.companyLocation.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    // Check company ownership
    if (existing.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden access",
      });
    }

    // Build update data
    const updateData = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Nama lokasi wajib diisi",
        });
      }
      // Check duplicate name (excluding current)
      const duplicate = await prisma.companyLocation.findFirst({
        where: {
          companyId,
          name: name.trim(),
          id: { not: Number(id) },
        },
      });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Lokasi dengan nama tersebut sudah ada",
        });
      }
      updateData.name = name.trim();
    }

    if (address !== undefined) {
      updateData.address = address?.trim() || null;
    }

    if (latitude !== undefined) {
      const lat = parseFloat(latitude);
      if (isNaN(lat)) {
        return res.status(400).json({
          success: false,
          message: "Latitude harus berupa angka",
        });
      }
      updateData.latitude = lat;
    }

    if (longitude !== undefined) {
      const lng = parseFloat(longitude);
      if (isNaN(lng)) {
        return res.status(400).json({
          success: false,
          message: "Longitude harus berupa angka",
        });
      }
      updateData.longitude = lng;
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    const location = await prisma.companyLocation.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return res.json({
      success: true,
      message: "Lokasi berhasil diperbarui",
      data: location,
    });
  } catch (err) {
    console.error("Error updateLocation:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update location",
    });
  }
}

/**
 * DELETE /api/locations/:id
 * Delete location - Admin only
 */
export async function deleteLocation(req, res) {
  try {
    const { id } = req.params;
    const { companyId, role } = req.user;

    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Hanya admin yang bisa menghapus lokasi",
      });
    }

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Company belum diset untuk user ini",
      });
    }

    // Check exists
    const existing = await prisma.companyLocation.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    // Check company ownership
    if (existing.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden access",
      });
    }

    await prisma.companyLocation.delete({
      where: { id: Number(id) },
    });

    return res.json({
      success: true,
      message: "Lokasi berhasil dihapus",
    });
  } catch (err) {
    console.error("Error deleteLocation:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete location",
    });
  }
}
