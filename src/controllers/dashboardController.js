import { prisma } from "../utils/prisma.js";

export async function getMyDashboard(req, res) {
  try {
    const { month, year: queryYear } = req.query;
    const { employeeId } = req.user;

    if (!employeeId) {
      return res.status(403).json({ message: "Employee only" });
    }

    // ===================== DATE RANGE FOR MONTH =====================
    let startDate, endDate, currentYear, currentMonth;
    
    if (month) {
      const [year, m] = month.split("-");
      currentYear = Number(year);
      currentMonth = Number(m);
      startDate = new Date(currentYear, currentMonth - 1, 1);
      endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);
    } else {
      const now = new Date();
      currentYear = now.getFullYear();
      currentMonth = now.getMonth() + 1;
      startDate = new Date(currentYear, currentMonth - 1, 1);
      endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);
    }

    // ===================== CHECKCLOCK FOR MONTH =====================
    const records = await prisma.checkClock.findMany({
      where: {
        employeeId,
        OR: [
          { time: { gte: startDate, lte: endDate } },
          { startDate: { gte: startDate, lte: endDate } },
        ],
      },
      orderBy: { time: 'desc' }
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

    // ===================== WORK HOURS CALCULATION =====================
    // Calculate total work hours for the month
    let totalWorkMinutes = 0;
    
    // Pair clock-in with clock-out to calculate work hours
    const clockIns = records.filter(r => r.type === 'CLOCK_IN').sort((a, b) => new Date(a.time) - new Date(b.time));
    const clockOuts = records.filter(r => r.type === 'CLOCK_OUT').sort((a, b) => new Date(a.time) - new Date(b.time));
    
    // Simple pairing: match clock-in with clock-out on the same day
    clockIns.forEach(clockIn => {
      const clockInDate = new Date(clockIn.time).toDateString();
      const matchingClockOut = clockOuts.find(co => new Date(co.time).toDateString() === clockInDate);
      
      if (matchingClockOut) {
        const diff = new Date(matchingClockOut.time) - new Date(clockIn.time);
        totalWorkMinutes += Math.floor(diff / (1000 * 60));
      }
    });

    const totalWorkHours = Math.floor(totalWorkMinutes / 60);
    const totalWorkMins = totalWorkMinutes % 60;

    // ===================== YEARLY WORK HOURS FOR CHART =====================
    const yearForChart = queryYear ? Number(queryYear) : currentYear;
    const yearStart = new Date(yearForChart, 0, 1);
    const yearEnd = new Date(yearForChart, 11, 31, 23, 59, 59);

    const yearRecords = await prisma.checkClock.findMany({
      where: {
        employeeId,
        time: { gte: yearStart, lte: yearEnd },
        type: { in: ['CLOCK_IN', 'CLOCK_OUT'] }
      },
      orderBy: { time: 'asc' }
    });

    // Calculate hours per month
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const workHoursData = monthNames.map((monthName, index) => {
      const monthClockIns = yearRecords.filter(r => 
        r.type === 'CLOCK_IN' && new Date(r.time).getMonth() === index
      );
      const monthClockOuts = yearRecords.filter(r => 
        r.type === 'CLOCK_OUT' && new Date(r.time).getMonth() === index
      );

      let monthMinutes = 0;
      monthClockIns.forEach(clockIn => {
        const clockInDate = new Date(clockIn.time).toDateString();
        const matchingClockOut = monthClockOuts.find(co => new Date(co.time).toDateString() === clockInDate);
        
        if (matchingClockOut) {
          const diff = new Date(matchingClockOut.time) - new Date(clockIn.time);
          monthMinutes += Math.floor(diff / (1000 * 60));
        }
      });

      return {
        month: monthName,
        hours: Math.floor(monthMinutes / 60)
      };
    });

    // ===================== STAT CARDS DATA =====================
    const stats = {
      workHours: totalWorkHours,
      workMinutes: totalWorkMins,
      onTime: attendance.ON_TIME,
      late: attendance.LATE,
      absent: attendance.ABSENT
    };

    // Format month name for display
    const monthNames2 = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const displayMonth = `${monthNames2[currentMonth - 1]} ${currentYear}`;

    res.json({
      success: true,
      stats,
      attendance,
      leave,
      workHoursChart: workHoursData,
      displayMonth,
      currentMonth: `${currentYear}-${String(currentMonth).padStart(2, '0')}`
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ message: "Dashboard failed" });
  }
}
