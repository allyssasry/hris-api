import { prisma } from "../utils/prisma.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const ALLOWED_TYPES = [
  "CLOCK_IN",
  "CLOCK_OUT",
  "ABSENT",
  "ANNUAL_LEAVE",
  "SICK_LEAVE",
];

/* ===================== HELPER: Get Employee's Scheduled Clock In Time ===================== */
async function getScheduledClockInTime(employeeId, date) {
  // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = date.getDay();
  
  // Get employee's userId
  const employee = await prisma.employee.findUnique({
    where: { id: Number(employeeId) },
    select: { userId: true }
  });
  
  if (!employee?.userId) return null;
  
  // Find active UserShift for this employee
  const userShift = await prisma.userShift.findFirst({
    where: {
      userId: employee.userId,
      effectiveFrom: { lte: date },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: date } }
      ]
    },
    include: {
      setting: {
        include: {
          times: {
            where: { day: dayOfWeek }
          }
        }
      }
    },
    orderBy: { effectiveFrom: 'desc' }
  });
  
  if (!userShift?.setting?.times?.[0]?.clockInMinutes) {
    return null; // No schedule found, will use default
  }
  
  const clockInMinutes = userShift.setting.times[0].clockInMinutes;
  return clockInMinutes; // Returns minutes from midnight (e.g., 480 for 08:00, 960 for 16:00)
}

/* ===================== HELPER: Determine LATE/ON_TIME Status ===================== */
async function determineClockInStatus(employeeId, clockInTime) {
  const scheduledMinutes = await getScheduledClockInTime(employeeId, clockInTime);
  
  // Convert current time to minutes from midnight
  const currentHour = clockInTime.getHours();
  const currentMinute = clockInTime.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  
  if (scheduledMinutes !== null) {
    // Use scheduled time from Work Schedule
    return currentTotalMinutes > scheduledMinutes ? "LATE" : "ON_TIME";
  } else {
    // Default: 08:00 (480 minutes)
    const defaultClockIn = 8 * 60; // 08:00
    return currentTotalMinutes > defaultClockIn ? "LATE" : "ON_TIME";
  }
}

function getWIBRange(year, month) {
  // WIB = UTC+7
  const start = new Date(Date.UTC(year, month - 1, 1, -7, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, -7, 0, 0));
  return { start, end };
}

function calcWorkHours(start, end) {
  if (!start || !end) return null;

  const diffMs = new Date(end) - new Date(start);
  const totalMinutes = Math.floor(diffMs / 60000);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    workMinutes: totalMinutes,
    workHoursText:
      minutes > 0 ? `${hours} jam ${minutes} menit` : `${hours} jam`,
  };
}

// async function autoClockOutAt22() {
//   const now = new Date();
//   const hour = now.getHours();

//   // ⛔ Belum jam 22
//   if (hour < 22) return;

//   const autoClockOutTime = new Date(now);
//   autoClockOutTime.setHours(22, 0, 0, 0);

//   await prisma.checkClock.updateMany({
//     where: {
//       type: "CLOCK_IN",
//       clockOutTime: null,
//       time: {
//         lt: autoClockOutTime, // hanya yg masuk sebelum jam 22
//       },
//     },
//     data: {
//       clockOutTime: autoClockOutTime,
//     },
//   });
// }

async function autoClockOutAt2130() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  // ⛔ Belum jam 21:30
  if (hour < 21 || (hour === 21 && minute < 30)) return;

  const autoClockOutTime = new Date(now);
  autoClockOutTime.setHours(21, 30, 0, 0);

  await prisma.checkClock.updateMany({
    where: {
      type: "CLOCK_IN",
      clockOutTime: null,
      time: {
        lt: autoClockOutTime, // hanya yang masuk sebelum 21:30
      },
    },
    data: {
      clockOutTime: autoClockOutTime,
    },
  });
}

/* ===================== LIST ===================== */
export async function listAdminCheckclocks(req, res, next) {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const { companyId } = req.user; // 🔑 Get companyId from JWT
    
    if (!companyId) {
      return res.status(403).json({ message: "Company belum diset untuk user ini" });
    }

    await autoClockOutAt2130();

    // ✅ FILTER BY COMPANY - Only show checkclocks from employees in this company
    const clocks = await prisma.checkClock.findMany({
      where: {
        employee: {
          companyId: companyId  // 🔑 Filter by company
        }
      },
      include: { employee: true },
      orderBy: { time: "desc" },
    });

  const rows = clocks.map((c) => {
  const e = c.employee || {};
  const isLeave = ["ABSENT", "ANNUAL_LEAVE", "SICK_LEAVE"].includes(c.type);

  const formatTime = (t) =>
    t
      ? new Date(t).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  let displayStatus = "-";

  if (c.type === "CLOCK_IN") {
    displayStatus =
      c.status === "LATE"
        ? "Late"
        : c.status === "ON_TIME"
        ? "On Time"
        : "-";
  } else if (isLeave) {
    displayStatus =
      c.approval === "APPROVED"
        ? c.type.replace("_", " ")
        : "Pending";
  }

  const work = !isLeave
    ? calcWorkHours(c.time, c.clockOutTime)
    : null;

  return {
    id: c.id,
    employeeId: c.employeeId,

    employeeName:
      [e.firstName, e.lastName].filter(Boolean).join(" ") || "Unknown",

    jobdesk: e.jobdesk || "-", // ✅ JABATAN

    avatar: e.avatar || null,

    attendanceType: c.type,

    clockIn: !isLeave ? formatTime(c.time) : "-",
    clockOut: !isLeave ? formatTime(c.clockOutTime) : "-",

    workMinutes: work?.workMinutes ?? null,
    workHours: work?.workHoursText ?? "-", // ✅ JAM + MENIT

    status: displayStatus,
    approval: c.approval ?? "PENDING",
    createdByRole: c.approvedBy ? "admin" : "user", // ✅ PENTING
    canClockOut:
      c.type === "CLOCK_IN" &&
      !c.clockOutTime &&
      !isLeave,

    startDate: c.startDate ?? null,
    endDate: c.endDate ?? null,

    // ✅ LOCATION DATA
    locationName: c.locationName ?? null,
    address: c.address ?? null,
    latitude: c.latitude ?? null,
    longitude: c.longitude ?? null,

    notes: c.notes ?? null,
    
    // ✅ CLOCK IN PROOF
    proofUrl: c.proofPath,
    proofName: c.proofName,
    
    // ✅ CLOCK OUT PROOF (NEW)
    clockOutProofUrl: c.clockOutProofPath ?? null,
    clockOutProofName: c.clockOutProofName ?? null,
  };
});


    res.json(rows);
  } catch (err) {
    console.error(err);
    next(err);
  }
}

/* ===================== CREATE ===================== */
export async function createAdminCheckclock(req, res, next) {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const {
      employeeId,
      type,
      locationName,
      address,
      notes,
      startDate,
      endDate,
      latitude,
      longitude,
    } = req.body;

    if (!employeeId || !type) {
      return res.status(400).json({
        message: "employeeId & type are required",
      });
    }

    const normalizedType = type.toUpperCase();
    if (!ALLOWED_TYPES.includes(normalizedType)) {
      return res.status(400).json({ message: "Invalid attendance type" });
    }

    const now = new Date();
    const proofFile = req.file;
    
    // Upload proof to Cloudinary if exists
    let proofUrl = null;
    let proofName = null;
    if (proofFile && proofFile.buffer) {
      const uploadResult = await uploadToCloudinary(
        proofFile.buffer,
        'hris/checkclock-proofs',
        `proof-${Date.now()}`
      );
      proofUrl = uploadResult.url;
      proofName = proofFile.originalname;
    }

    /* =====================================================
       🔥 CLOCK OUT (ADMIN) — UPDATE, BUKAN CREATE
    ===================================================== */
    if (normalizedType === "CLOCK_OUT") {
      const open = await prisma.checkClock.findFirst({
        where: {
          employeeId: Number(employeeId),
          type: "CLOCK_IN",
          clockOutTime: null,
        },
        orderBy: { time: "desc" },
      });

      if (!open) {
        return res.status(400).json({
          message: "No active clock in to clock out",
        });
      }

      const updated = await prisma.checkClock.update({
        where: { id: open.id },
        data: {
          clockOutTime: now,
          approvedBy: req.user.id,
          approvedAt: now,
          // Save clock out proof to Cloudinary
          clockOutProofPath: proofUrl,
          clockOutProofName: proofName,
        },
      });

      return res.status(200).json({ data: updated });
    }

    /* =====================================================
       ✅ CLOCK IN / ABSENT / LEAVE — CREATE DATA
    ===================================================== */

    // ===================== STATUS CLOCK IN =====================
    let status = null;
    if (normalizedType === "CLOCK_IN") {
      // Use scheduled time from Work Schedule, fallback to default 08:00
      status = await determineClockInStatus(employeeId, now);
    }

    const created = await prisma.checkClock.create({
      data: {
        employeeId: Number(employeeId),
        type: normalizedType,

        // ⏰ TIME (HANYA CLOCK IN)
        time: now,
        clockOutTime: null,

        // 📅 DATE RANGE (CUTI / ABSENT)
       // 📅 DATE RANGE LOGIC
startDate:
  normalizedType === "ABSENT"
    ? new Date(now.setHours(0, 0, 0, 0)) // hari ini
    : ["ANNUAL_LEAVE", "SICK_LEAVE"].includes(normalizedType)
    ? new Date(startDate)
    : null,

endDate:
  normalizedType === "ABSENT"
    ? new Date(now.setHours(23, 59, 59, 999)) // hari ini
    : ["ANNUAL_LEAVE", "SICK_LEAVE"].includes(normalizedType)
    ? new Date(endDate)
    : null,

        // 📍 LOKASI
        locationName: locationName || "N/A",
        address: address || "N/A",
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,

        // 📝 NOTES & FILE - Now using Cloudinary URL
        notes: notes || null,
        proofPath: proofUrl,
        proofName: proofName,

        // 🧾 STATUS
        status,
        approval: "APPROVED",
        approvedBy: req.user.id,
        approvedAt: now,
      },
    });

    res.status(201).json({ data: created });
  } catch (err) {
    console.error(err);
    next(err);
  }
}


/* ===================== APPROVE ===================== */
export async function approveAdminCheckclock(req, res, next) {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const { id } = req.params;
    const { approved } = req.body;
    const approvalStatus = approved ? "APPROVED" : "REJECTED";

    // Get checkclock with employee info before update
    const checkclock = await prisma.checkClock.findUnique({
      where: { id: Number(id) },
      include: { 
        employee: {
          select: { id: true, firstName: true, lastName: true, userId: true }
        } 
      },
    });

    if (!checkclock) {
      return res.status(404).json({ message: "Checkclock not found" });
    }

    const updated = await prisma.checkClock.update({
      where: { id: Number(id) },
      data: {
        approval: approvalStatus,
        approvedBy: req.user.id,
        approvedAt: new Date(),
      },
    });

    // Send notification to employee
    if (checkclock.employee?.userId) {
      const employeeName = `${checkclock.employee.firstName || ""} ${checkclock.employee.lastName || ""}`.trim();
      const typeLabel = {
        CLOCK_IN: "Clock In",
        CLOCK_OUT: "Clock Out",
        ABSENT: "Absent",
        ANNUAL_LEAVE: "Annual Leave",
        SICK_LEAVE: "Sick Leave",
      }[checkclock.type] || checkclock.type;

      try {
        // Get employee's companyId for multi-tenancy
        const employeeCompany = await prisma.employee.findUnique({
          where: { id: checkclock.employeeId },
          select: { companyId: true }
        });

        await prisma.notification.create({
          data: {
            userId: checkclock.employee.userId,
            fromUserId: req.user.id,
            companyId: employeeCompany?.companyId || req.user.companyId,  // 🔑 Include companyId
            type: approved ? "CHECKCLOCK_APPROVED" : "CHECKCLOCK_REJECTED",
            title: approved ? "Absensi Disetujui" : "Absensi Ditolak",
            message: approved 
              ? `Permintaan ${typeLabel} Anda telah disetujui oleh Admin.`
              : `Permintaan ${typeLabel} Anda telah ditolak oleh Admin.`,
            data: {
              checkclockId: checkclock.id,
              type: checkclock.type,
              employeeId: checkclock.employeeId,
              companyId: employeeCompany?.companyId,
            },
          },
        });
      } catch (notifErr) {
        console.error("Failed to create notification:", notifErr);
        // Don't fail the approve operation if notification fails
      }
    }

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

/* ===================== DETAIL ===================== */
/* ===================== DETAIL ===================== */
export async function getAdminCheckclockDetail(req, res, next) {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const id = Number(req.params.id);

    const data = await prisma.checkClock.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!data) {
      return res.status(404).json({ message: "Attendance not found" });
    }
    const work = data.clockOutTime
  ? calcWorkHours(data.time, data.clockOutTime)
  : null;


    // 🔥 PAKSA NO CACHE
    res.set("Cache-Control", "no-store");

    const baseResponse = {
      id: data.id,
      employeeId: data.employeeId,
      employeeName: [data.employee?.firstName, data.employee?.lastName]
        .filter(Boolean)
        .join(" "),
      jobdesk: data.employee?.jobdesk || "-",
      avatar: data.employee?.avatar || null,

      attendanceType: data.type,
      approval: data.approval,
      status: data.status,

      date: data.time,

      locationName: data.locationName,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,

      notes: data.notes,

      proofUrl: data.proofPath,
      proofName: data.proofName,
    };

    if (["ABSENT", "ANNUAL_LEAVE", "SICK_LEAVE"].includes(data.type)) {
      return res.json({
        ...baseResponse,
        startDate: data.startDate,
        endDate: data.endDate,
        clockIn: null,
        clockOut: null,
        workHours: null,
      });
    }

    return res.json({
      ...baseResponse,
      clockIn: data.time,
      clockOut: data.clockOutTime,
      workMinutes: work?.workMinutes ?? null,
      workHours: work?.workHoursText ?? null,
      startDate: null,
      endDate: null,
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
}
export async function getAttendanceStats(req, res) {
  try {
    const { month, year } = req.query;

    const { start, end } = getWIBRange(Number(year), Number(month));

    const records = await prisma.checkClock.findMany({
      where: {
        approval: "APPROVED",
        OR: [
          {
            type: "CLOCK_IN",
            time: {
              gte: start,
              lt: end,
            },
          },
          {
            type: { in: ["ABSENT", "ANNUAL_LEAVE", "SICK_LEAVE"] },
            startDate: {
              gte: start,
              lt: end,
            },
          },
        ],
      },
      select: {
        type: true,
        status: true,
      },
    });

    const stats = {
      onTime: 0,
      late: 0,
      absent: 0,
      annualLeave: 0,
      sickLeave: 0,
    };

    records.forEach((r) => {
      if (r.type === "CLOCK_IN") {
        if (r.status === "ON_TIME") stats.onTime++;
        if (r.status === "LATE") stats.late++;
      }
      if (r.type === "ABSENT") stats.absent++;
      if (r.type === "ANNUAL_LEAVE") stats.annualLeave++;
      if (r.type === "SICK_LEAVE") stats.sickLeave++;
    });

    res.json({ success: true, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
}

export async function getAttendanceTable(req, res) {
  try {
    const { month, year } = req.query;

    const { start, end } = getWIBRange(Number(year), Number(month));

    const records = await prisma.checkClock.findMany({
      where: {
        approval: "APPROVED",
        OR: [
          {
            type: "CLOCK_IN",
            time: { gte: start, lt: end },
          },
          {
            type: { in: ["ABSENT", "ANNUAL_LEAVE", "SICK_LEAVE"] },
            startDate: { gte: start, lt: end },
          },
        ],
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { time: "desc" },
      take: 5, // ⭐ HANYA 5 DATA
    });

    const rows = records.map((r, i) => ({
      no: i + 1,
      name:
        [r.employee?.firstName, r.employee?.lastName]
          .filter(Boolean)
          .join(" ") || "Unknown",

      status:
        r.type === "CLOCK_IN"
          ? r.status === "ON_TIME"
            ? "Ontime"
            : "Late"
          : r.type === "ABSENT"
          ? "Absent"
          : r.type === "ANNUAL_LEAVE"
          ? "Annual Leave"
          : "Sick Leave",

      statusColor:
        r.type === "CLOCK_IN"
          ? r.status === "ON_TIME"
            ? "#16A34A"
            : "#F97316"
          : r.type === "ABSENT"
          ? "#EF4444"
          : r.type === "ANNUAL_LEAVE"
          ? "#0EA5E9"
          : "#6366F1",

      checkIn:
        r.type === "CLOCK_IN"
          ? new Date(r.time).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-",
    }));

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("Attendance table error:", err);
    res.status(500).json({ success: false });
  }
}
