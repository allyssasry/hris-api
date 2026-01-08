import { prisma } from "../utils/prisma.js";

export async function getMyDashboard(req, res) {
  try {
    const { month } = req.query;
    const { employeeId } = req.user;

    if (!employeeId) {
      return res.status(403).json({ message: "Employee only" });
    }

    // ===================== DATE RANGE =====================
    const [year, m] = month.split("-");
    const startDate = new Date(Number(year), Number(m) - 1, 1);
    const endDate = new Date(Number(year), Number(m), 0, 23, 59, 59);

    // ===================== CHECKCLOCK =====================
    const records = await prisma.checkClock.findMany({
      where: {
        employeeId,
        OR: [
          { time: { gte: startDate, lte: endDate } },
          { startDate: { gte: startDate, lte: endDate } },
        ],
      },
    });

    // ===================== ATTENDANCE SUMMARY =====================
    const attendance = {
      ON_TIME: 0,
      LATE: 0,
      ABSENT: 0,
    };

    records.forEach((r) => {
      if (r.type === "CLOCK_IN") {
        r.status === "LATE" ? attendance.LATE++ : attendance.ON_TIME++;
      }
      if (r.type === "ABSENT") attendance.ABSENT++;
    });

    // ===================== LEAVE SUMMARY =====================
    const quotaDays = 12;

    const takenDays = records.filter((r) =>
      ["ANNUAL_LEAVE", "SICK_LEAVE"].includes(r.type)
    ).length;

    const leave = {
      quotaDays,
      takenDays,
      remainingDays: quotaDays - takenDays,
    };

    res.json({
      success: true,
      attendance,
      leave,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ message: "Dashboard failed" });
  }
}
