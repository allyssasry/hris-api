import { prisma } from "../utils/prisma.js";

/* ===================== CONSTANT ===================== */
const ALLOWED_TYPES = [
  "CLOCK_IN",
  "CLOCK_OUT",
  "ABSENT",
  "ANNUAL_LEAVE",
  "SICK_LEAVE",
];


/* ===================== HELPER ===================== */
function calcWorkHours(start, end) {
  if (!start || !end) return null;

  const diffMs = new Date(end) - new Date(start);
  const totalMinutes = Math.floor(diffMs / 60000);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes > 0
    ? `${hours} jam ${minutes} menit`
    : `${hours} jam`;
}
function diffMinutes(start, end) {
  return Math.floor((new Date(end) - new Date(start)) / 60000);
}

/* ===================== AUTO CLOCK OUT 21:30 ===================== */
async function autoClockOutAt2130() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  // ⛔ belum jam 21:30
  if (hour < 21 || (hour === 21 && minute < 30)) return;

  const autoClockOutTime = new Date();
  autoClockOutTime.setHours(21, 30, 0, 0);

  await prisma.checkClock.updateMany({
    where: {
      type: "CLOCK_IN",
      clockOutTime: null,
      time: {
        lt: autoClockOutTime,
      },
    },
    data: {
      clockOutTime: autoClockOutTime,
    },
  });
}

/* ============================================================
   ===================== LIST USER ============================
   GET /api/user/check-clocks/me
   ============================================================ */
export async function listUserCheckclocks(req, res, next) {
  try {
    await autoClockOutAt2130();

    const employeeId = req.user.employeeId;

    const records = await prisma.checkClock.findMany({
      where: { employeeId },
      orderBy: [
        { time: "desc" },
        { startDate: "desc" },
      ],
    });

    const rows = records.map((r) => {
      const isClock = r.type === "CLOCK_IN";
      const isLeave = ["ABSENT", "ANNUAL_LEAVE", "SICK_LEAVE"].includes(r.type);

      let workHours = null;
      if (isClock && r.clockOutTime) {
        workHours = calcWorkHours(r.time, r.clockOutTime);
      }

      return {
        id: r.id,
        type: r.type,

        // 🔑 DATE UTAMA (FE PAKAI INI)
        date: r.time ?? r.startDate,

        // ⏰ CLOCK
        clockIn: isClock ? r.time : null,
        clockOut: isClock ? r.clockOutTime : null,

        // ⏱️ JAM KERJA
        workHours,

        // 🧾 APPROVAL
        approval: r.approval ?? "PENDING",
      };
    });

    res.json(rows);
  } catch (err) {
    next(err);
  }
}


/* ============================================================
   ===================== CREATE USER ==========================
   POST /api/user/check-clocks
   ============================================================ */
export async function createUserCheckclock(req, res, next) {
  try {
    const employeeId = req.user.employeeId;

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const {
      type,
      locationName,
      address,
      notes,
      startDate,
      endDate,
      latitude,
      longitude,
    } = req.body;

    const normalizedType = type?.toUpperCase();
    if (!ALLOWED_TYPES.includes(normalizedType)) {
      return res.status(400).json({ message: "Invalid attendance type" });
    }

    const now = new Date();
    const proofFile = req.file;

    /* ================= CLOCK OUT ================= */
    if (normalizedType === "CLOCK_OUT") {
      const openClock = await prisma.checkClock.findFirst({
        where: {
          employeeId,
          type: "CLOCK_IN",
          clockOutTime: null,
        },
        orderBy: { time: "desc" },
      });

      if (!openClock) {
        return res.status(400).json({
          message: "No active clock in",
        });
      }

      const updated = await prisma.checkClock.update({
        where: { id: openClock.id },
        data: {
          clockOutTime: now,
        },
      });

      return res.json({ data: updated });
    }

    /* ============ CEGAH CLOCK IN DOBEL ============ */
    if (normalizedType === "CLOCK_IN") {
      const open = await prisma.checkClock.findFirst({
        where: {
          employeeId,
          type: "CLOCK_IN",
          clockOutTime: null,
        },
      });

      if (open) {
        return res.status(400).json({
          message: "Anda masih Clock In dan belum Clock Out",
        });
      }
    }

    /* ================= STATUS CLOCK IN ================= */
    let status = null;
    if (normalizedType === "CLOCK_IN") {
      const hour = now.getHours();
      const minute = now.getMinutes();
      status =
        hour > 8 || (hour === 8 && minute > 0) ? "LATE" : "ON_TIME";
    }

    /* ================= DATE RANGE (AMAN) ================= */
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const created = await prisma.checkClock.create({
      data: {
        employeeId,
        type: normalizedType,

        // ⏰ waktu
        time: normalizedType === "CLOCK_IN" ? now : null,
        clockOutTime: null,

        // 📅 tanggal
        startDate:
          normalizedType === "ABSENT"
            ? todayStart
            : ["ANNUAL_LEAVE", "SICK_LEAVE"].includes(normalizedType)
            ? new Date(startDate)
            : null,

        endDate:
          normalizedType === "ABSENT"
            ? todayEnd
            : ["ANNUAL_LEAVE", "SICK_LEAVE"].includes(normalizedType)
            ? new Date(endDate)
            : null,

        // 📍 lokasi
        locationName: locationName || "N/A",
        address: address || "N/A",
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,

        // 📝 bukti
        notes: notes || null,
        proofPath: proofFile
          ? `/uploads/checkclock-proofs/${proofFile.filename}`
          : null,
        proofName: proofFile ? proofFile.originalname : null,

        // 🧾 approval (USER → PENDING)
        status,
        approval: "PENDING",
        approvedBy: null,
        approvedAt: null,
      },
    });

    // Send notification to admins OF THE SAME COMPANY about new checkclock submission
    try {
      // Get employee's companyId for multi-tenancy filtering
      const employeeCompany = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { companyId: true }
      });

      if (!employeeCompany?.companyId) {
        console.error("Employee has no companyId, skipping admin notification");
      } else {
        // Only get admins from the SAME company
        const admins = await prisma.user.findMany({
          where: { 
            role: "admin",
            companyId: employeeCompany.companyId  // 🔑 Filter by company
          },
          select: { id: true },
        });

        console.log(`[Notification] Sending to ${admins.length} admins of company ${employeeCompany.companyId}`);

        const typeLabel = {
          CLOCK_IN: "Clock In",
          CLOCK_OUT: "Clock Out",
          ABSENT: "Absent",
          ANNUAL_LEAVE: "Annual Leave",
          SICK_LEAVE: "Sick Leave",
        }[normalizedType] || normalizedType;

        await Promise.all(
          admins.map((admin) =>
            prisma.notification.create({
              data: {
                userId: admin.id,
                fromUserId: req.user.id,
                companyId: employeeCompany.companyId,  // 🔑 Include companyId
                type: "CHECKCLOCK_SUBMITTED",
                title: "Pengajuan Absensi Baru",
                message: `${employee.firstName || "Employee"} ${employee.lastName || ""} mengajukan ${typeLabel} dan menunggu persetujuan.`,
                data: {
                  checkclockId: created.id,
                  type: normalizedType,
                  employeeId,
                  companyId: employeeCompany.companyId,
                },
              },
            })
          )
        );
      }
    } catch (notifErr) {
      console.error("Failed to notify admins:", notifErr);
      // Don't fail the create operation if notification fails
    }

    res.status(201).json({ data: created });
  } catch (err) {
    console.error("createUserCheckclock error:", err);
    next(err);
  }
}
/* ============================================================
   =============== ATTENDANCE SUMMARY =========================
   GET /api/user/check-clocks/summary?month=YYYY-MM
   ============================================================ */
export async function getUserAttendanceSummary(req, res, next) {
  try {
    const employeeId = req.user.employeeId;
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({ message: "Month is required (YYYY-MM)" });
    }

    const [year, m] = month.split("-");
    const startDate = new Date(Number(year), Number(m) - 1, 1);
    const endDate = new Date(Number(year), Number(m), 0, 23, 59, 59);

    const records = await prisma.checkClock.findMany({
      where: {
        employeeId,
        OR: [
          // CLOCK IN (berdasarkan time)
          {
            type: "CLOCK_IN",
            time: { gte: startDate, lte: endDate },
          },

          // ABSENT
          {
            type: "ABSENT",
            startDate: { gte: startDate, lte: endDate },
          },

          // LEAVE (range overlap)
          {
            type: { in: ["ANNUAL_LEAVE", "SICK_LEAVE"] },
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: startDate } },
            ],
          },
        ],
      },
    });

    let onTime = 0;
    let late = 0;
    let absent = 0;
    let leave = 0;
    let annualLeave = 0;
let sickLeave = 0;

    for (const r of records) {
      if (r.type === "CLOCK_IN") {
        if (r.status === "ON_TIME") onTime++;
        if (r.status === "LATE") late++;
      }

     if (r.type === "ABSENT") absent++;

  if (["ANNUAL_LEAVE", "SICK_LEAVE"].includes(r.type)) {
    const days =
      Math.floor(
        (new Date(r.endDate) - new Date(r.startDate)) / 86400000
      ) + 1;

    if (r.type === "ANNUAL_LEAVE") annualLeave += days;
    if (r.type === "SICK_LEAVE") sickLeave += days;
  }
}

    res.json({
       onTime,
  late,
  absent,
  annualLeave,
  sickLeave,
    });
  } catch (err) {
    next(err);
  }
}
export async function getUserWorkHours(req, res, next) {
  try {
    const employeeId = req.user.employeeId;
    const { month, view = "week" } = req.query;

    if (!month) {
      return res.status(400).json({ message: "Month required (YYYY-MM)" });
    }

    const [year, m] = month.split("-");
    const monthStart = new Date(Number(year), Number(m) - 1, 1);
    const monthEnd = new Date(Number(year), Number(m), 0, 23, 59, 59);

    const records = await prisma.checkClock.findMany({
      where: {
        employeeId,
        type: "CLOCK_IN",
        clockOutTime: { not: null },
        time: { gte: monthStart, lte: monthEnd },
      },
    });

    const buckets = {};
    let totalMinutes = 0;

    for (const r of records) {
      const minutes = diffMinutes(r.time, r.clockOutTime);
      totalMinutes += minutes;

      const d = new Date(r.time);
      let label = null;

      if (view === "week") {
        // ISO weekday: Senin = 1
        const day = d.getDay();
        const map = {
          1: "Mon",
          2: "Tue",
          3: "Wed",
          4: "Thu",
          5: "Fri",
        };
        label = map[day];
      } else {
        // Week 1–4 dalam bulan
        const week = Math.ceil(d.getDate() / 7);
        label = `Week ${week}`;
      }

      if (!label) continue;
      buckets[label] = (buckets[label] || 0) + minutes;
    }

    const order =
      view === "week"
        ? ["Mon", "Tue", "Wed", "Thu", "Fri"]
        : ["Week 1", "Week 2", "Week 3", "Week 4"];

    res.json({
      totalMinutes,
      series: order.map(label => ({
        label,
        minutes: buckets[label] || 0,
      })),
    });
  } catch (err) {
    next(err);
  }
}


export async function getUserLeaveSummary(req, res, next) {
  try {
    const employeeId = req.user.employeeId;
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({ message: "Month required (YYYY-MM)" });
    }

    const [year, m] = month.split("-");
    const start = new Date(Number(year), Number(m) - 1, 1);
    const end = new Date(Number(year), Number(m), 0, 23, 59, 59);

    const leaves = await prisma.checkClock.findMany({
      where: {
        employeeId,
        type: { in: ["ANNUAL_LEAVE", "SICK_LEAVE"] },
        AND: [
          { startDate: { lte: end } },
          { endDate: { gte: start } },
        ],
        approval: "APPROVED", // 🔑 OPTIONAL tapi disarankan
      },
    });

    let annualLeaveDays = 0;
    let sickLeaveDays = 0;

    for (const l of leaves) {
      // hitung jumlah hari (inclusive)
      const days =
        Math.floor(
          (new Date(l.endDate) - new Date(l.startDate)) / 86400000
        ) + 1;

      if (l.type === "ANNUAL_LEAVE") annualLeaveDays += days;
      if (l.type === "SICK_LEAVE") sickLeaveDays += days;
    }

    const QUOTA = 10; // ⬅️ sesuai requirement kamu

    res.json({
      quotaDays: QUOTA,
      takenDays: annualLeaveDays,
      remainingDays: Math.max(0, QUOTA - annualLeaveDays),
      annualLeave: annualLeaveDays,
      sickLeave: sickLeaveDays,
    });
  } catch (err) {
    next(err);
  }
}
