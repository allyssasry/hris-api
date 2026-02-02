// src/controllers/adminDashboardController.js
import { prisma } from "../utils/prisma.js";

/**
 * GET /dashboard/admin/stats
 * Get admin dashboard statistics
 */
export async function getAdminDashboardStats(req, res) {
  try {
    const { month } = req.query; // format: "2026-01"
    
    // ===================== DATE RANGE =====================
    let startDate, endDate;
    if (month) {
      const [year, m] = month.split("-");
      startDate = new Date(Number(year), Number(m) - 1, 1);
      endDate = new Date(Number(year), Number(m), 0, 23, 59, 59);
    } else {
      // Default: current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    // ===================== EMPLOYEE STATS =====================
    // Get companyId from user
    const { companyId } = req.user;

    const companyFilter = companyId ? { companyId } : {};

    // Total employees
    const totalEmployees = await prisma.employee.count({
      where: companyFilter
    });
    
    // New employees (created this month - using createdAt since no joinDate)
    const newEmployees = await prisma.employee.count({
      where: {
        ...companyFilter,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    // Active employees (isActive = true AND terminationType = null)
    const activeEmployees = await prisma.employee.count({
      where: {
        ...companyFilter,
        isActive: true,
        terminationType: null
      }
    });
    
    // Past employees (terminated or resigned)
    const pastEmployees = await prisma.employee.count({
      where: {
        ...companyFilter,
        terminationType: { not: null }
      }
    });

    // ===================== EMPLOYEE STATUS STATS (5 tipe) =====================
    const permanentCount = await prisma.employee.count({
      where: { ...companyFilter, contractType: "permanent", terminationType: null }
    });
    
    const trialCount = await prisma.employee.count({
      where: { ...companyFilter, contractType: "trial", terminationType: null }
    });
    
    const contractCount = await prisma.employee.count({
      where: { ...companyFilter, contractType: "contract", terminationType: null }
    });
    
    const internCount = await prisma.employee.count({
      where: { ...companyFilter, contractType: "intern", terminationType: null }
    });

    const freelanceCount = await prisma.employee.count({
      where: { ...companyFilter, contractType: "freelance", terminationType: null }
    });

    // ===================== ATTENDANCE STATS =====================
    // Get today's date range
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // Get attendance records for selected month - FILTERED BY COMPANY
    const attendanceRecords = await prisma.checkClock.findMany({
      where: {
        OR: [
          { time: { gte: startDate, lte: endDate } },
          { startDate: { gte: startDate, lte: endDate } },
        ],
        type: "CLOCK_IN",
        employee: companyId ? { companyId } : undefined  // 🔑 Filter by company
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Count attendance statuses
    let onTimeCount = 0;
    let lateCount = 0;
    let absentCount = 0;

    attendanceRecords.forEach((record) => {
      if (record.status === "LATE") {
        lateCount++;
      } else if (record.status === "ON_TIME") {
        onTimeCount++;
      }
    });

    // Count absents - FILTERED BY COMPANY
    const absentRecords = await prisma.checkClock.count({
      where: {
        OR: [
          { time: { gte: startDate, lte: endDate } },
          { startDate: { gte: startDate, lte: endDate } },
        ],
        type: "ABSENT",
        employee: companyId ? { companyId } : undefined  // 🔑 Filter by company
      }
    });
    absentCount = absentRecords;

    // ===================== TODAY'S ATTENDANCE =====================
    const todayAttendance = await prisma.checkClock.findMany({
      where: {
        OR: [
          { time: { gte: todayStart, lte: todayEnd } },
          { startDate: { gte: todayStart, lte: todayEnd } },
        ],
        type: "CLOCK_IN",
        employee: companyId ? { companyId } : undefined  // 🔑 Filter by company
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        time: "asc"
      },
      take: 10
    });

    // ===================== RESPONSE =====================
    res.json({
      success: true,
      data: {
        employees: {
          total: totalEmployees,
          new: newEmployees,
          active: activeEmployees,
          past: pastEmployees
        },
        employeeStatus: {
          permanent: permanentCount,
          trial: trialCount,
          contract: contractCount,
          intern: internCount,
          freelance: freelanceCount
        },
        attendance: {
          onTime: onTimeCount,
          late: lateCount,
          absent: absentCount
        },
        todayAttendance: todayAttendance.map((record, index) => ({
          no: index + 1,
          name: `${record.employee?.firstName || ""} ${record.employee?.lastName || ""}`.trim() || "Unknown",
          status: record.status || "ON_TIME",
          checkIn: record.time ? new Date(record.time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) : "-"
        })),
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      }
    });
  } catch (err) {
    console.error("Admin Dashboard error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch dashboard stats",
      error: err.message 
    });
  }
}

/**
 * GET /dashboard/admin/employee-chart
 * Get employee statistics by month for chart
 */
export async function getEmployeeChartData(req, res) {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const { companyId } = req.user;
    const companyFilter = companyId ? { companyId } : {};

    const monthlyData = [];
    
    for (let month = 0; month < 12; month++) {
      const startDate = new Date(targetYear, month, 1);
      const endDate = new Date(targetYear, month + 1, 0, 23, 59, 59);
      
      // New employees created in this month (using createdAt)
      const newCount = await prisma.employee.count({
        where: {
          ...companyFilter,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });
      
      // Active employees as of this month (created before end of month, isActive=true, not terminated)
      const activeCount = await prisma.employee.count({
        where: {
          ...companyFilter,
          isActive: true,
          terminationType: null,
          createdAt: { lte: endDate }
        }
      });
      
      // Past employees count (terminated)
      const resignCount = await prisma.employee.count({
        where: {
          ...companyFilter,
          terminationType: { not: null }
        }
      });

      monthlyData.push({
        month: startDate.toLocaleString("en-US", { month: "long" }),
        new: newCount,
        active: activeCount,
        resign: resignCount
      });
    }

    res.json({
      success: true,
      data: monthlyData,
      year: targetYear
    });
  } catch (err) {
    console.error("Employee Chart error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch employee chart data",
      error: err.message 
    });
  }
}

/**
 * GET /dashboard/admin/status-chart
 * Get employee status distribution for chart (5 tipe kontrak)
 */
export async function getStatusChartData(req, res) {
  try {
    const { month } = req.query; // format: "2026-01"
    const { companyId } = req.user;
    const companyFilter = companyId ? { companyId } : {};
    
    // Only count active employees (not terminated)
    const activeFilter = { ...companyFilter, terminationType: null };
    
    // Get counts by contract type (5 tipe)
    const permanent = await prisma.employee.count({
      where: { ...activeFilter, contractType: "permanent" }
    });
    
    const trial = await prisma.employee.count({
      where: { ...activeFilter, contractType: "trial" }
    });
    
    const contract = await prisma.employee.count({
      where: { ...activeFilter, contractType: "contract" }
    });
    
    const intern = await prisma.employee.count({
      where: { ...activeFilter, contractType: "intern" }
    });

    const freelance = await prisma.employee.count({
      where: { ...activeFilter, contractType: "freelance" }
    });

    res.json({
      success: true,
      data: [
        { name: "Permanen", value: permanent },
        { name: "Percobaan", value: trial },
        { name: "PKWT (Kontrak)", value: contract },
        { name: "Magang", value: intern },
        { name: "Lepas", value: freelance }
      ]
    });
  } catch (err) {
    console.error("Status Chart error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch status chart data",
      error: err.message 
    });
  }
}

/**
 * GET /dashboard/admin/attendance-chart
 * Get attendance summary for pie chart
 */
export async function getAttendanceChartData(req, res) {
  try {
    const { date } = req.query; // format: "2026-01-21"
    
    let targetDate;
    if (date) {
      targetDate = new Date(date);
    } else {
      targetDate = new Date();
    }
    
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    // Count on-time check-ins
    const onTimeCount = await prisma.checkClock.count({
      where: {
        OR: [
          { time: { gte: dayStart, lte: dayEnd } },
          { startDate: { gte: dayStart, lte: dayEnd } },
        ],
        type: "CLOCK_IN",
        status: "ON_TIME"
      }
    });

    // Count late check-ins
    const lateCount = await prisma.checkClock.count({
      where: {
        OR: [
          { time: { gte: dayStart, lte: dayEnd } },
          { startDate: { gte: dayStart, lte: dayEnd } },
        ],
        type: "CLOCK_IN",
        status: "LATE"
      }
    });

    // Count absents
    const absentCount = await prisma.checkClock.count({
      where: {
        OR: [
          { time: { gte: dayStart, lte: dayEnd } },
          { startDate: { gte: dayStart, lte: dayEnd } },
        ],
        type: "ABSENT"
      }
    });

    res.json({
      success: true,
      data: [
        { name: "Ontime", value: onTimeCount, color: "#6366f1" },
        { name: "Late", value: lateCount, color: "#f87171" },
        { name: "Absent", value: absentCount, color: "#3cc3df" }
      ],
      date: targetDate.toISOString().split("T")[0]
    });
  } catch (err) {
    console.error("Attendance Chart error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch attendance chart data",
      error: err.message 
    });
  }
}
