import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} from "../controllers/notificationController.js";

const router = Router();

// All routes require authentication
router.use(auth(true));

/**
 * GET /api/notifications
 * Get all notifications for current user
 * Query params: limit (default 20), unreadOnly (true/false)
 */
router.get("/", getNotifications);

/**
 * GET /api/notifications/unread-count
 * Get only the unread count
 */
router.get("/unread-count", getUnreadCount);

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
router.patch("/read-all", markAllAsRead);

/**
 * PATCH /api/notifications/:id/read
 * Mark single notification as read
 */
router.patch("/:id/read", markAsRead);

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete("/:id", deleteNotification);

export default router;
