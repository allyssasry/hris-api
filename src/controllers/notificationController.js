import { prisma } from "../utils/prisma.js";

/**
 * Get notifications for current user
 * GET /api/notifications
 */
export async function getNotifications(req, res, next) {
  try {
    const userId = req.user.id;
    const { limit = 20, unreadOnly } = req.query;

    const where = { userId };
    if (unreadOnly === "true") {
      where.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    res.json({
      data: notifications,
      unreadCount,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
export async function markAsRead(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await prisma.notification.update({
      where: {
        id: parseInt(id),
        userId, // Ensure user owns this notification
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({ data: notification });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Notification not found" });
    }
    next(err);
  }
}

/**
 * Mark all notifications as read
 * PATCH /api/notifications/read-all
 */
export async function markAllAsRead(req, res, next) {
  try {
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a notification
 * DELETE /api/notifications/:id
 */
export async function deleteNotification(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await prisma.notification.delete({
      where: {
        id: parseInt(id),
        userId,
      },
    });

    res.json({ message: "Notification deleted" });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Notification not found" });
    }
    next(err);
  }
}

/**
 * Get unread count only
 * GET /api/notifications/unread-count
 */
export async function getUnreadCount(req, res, next) {
  try {
    const userId = req.user.id;

    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    res.json({ unreadCount: count });
  } catch (err) {
    next(err);
  }
}

/**
 * Helper function to create notification
 * Called from other controllers (e.g., when approving/rejecting checkclock)
 */
export async function createNotification({
  userId,
  fromUserId,
  type,
  title,
  message,
  data = null,
}) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        fromUserId,
        type,
        title,
        message,
        data,
      },
    });
    return notification;
  } catch (err) {
    console.error("Failed to create notification:", err);
    return null;
  }
}

/**
 * Send notification to all admins
 */
export async function notifyAdmins({ fromUserId, type, title, message, data }) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true },
    });

    const notifications = await Promise.all(
      admins.map((admin) =>
        createNotification({
          userId: admin.id,
          fromUserId,
          type,
          title,
          message,
          data,
        })
      )
    );

    return notifications;
  } catch (err) {
    console.error("Failed to notify admins:", err);
    return [];
  }
}

/**
 * Send notification to employee's user account
 */
export async function notifyEmployee({
  employeeId,
  fromUserId,
  companyId,  // 🔑 Added for multi-tenancy
  type,
  title,
  message,
  data,
}) {
  try {
    // Find employee's user account and companyId
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { userId: true, companyId: true, firstName: true, lastName: true },
    });

    if (!employee?.userId) {
      console.log(`Employee ${employeeId} has no linked user account`);
      return null;
    }

    return createNotification({
      userId: employee.userId,
      fromUserId,
      companyId: companyId || employee.companyId,  // 🔑 Use employee's company if not provided
      type,
      title,
      message,
      data,
    });
  } catch (err) {
    console.error("Failed to notify employee:", err);
    return null;
  }
}
