import { prisma } from "../utils/prisma.js";

// Day mapping: 0=Sunday, 1=Monday, ... 6=Saturday
const dayMapping = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday'
};

// Convert minutes to HH:MM format
function minutesToTime(minutes) {
  if (minutes === null || minutes === undefined) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// Convert HH:MM to minutes
function timeToMinutes(time) {
  if (!time) return null;
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
}

/**
 * Get all schedules with employee data
 * GET /api/schedules
 */
export async function getAllSchedules(req, res) {
  try {
    const { companyId } = req.user;
    const { search, page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get all employees with their schedules
    const whereClause = {
      companyId,
      ...(search && {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { jobdesk: { contains: search } },
          { branch: { contains: search } },
        ]
      })
    };

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where: whereClause,
        skip,
        take: limitNum,
        include: {
          User: {
            include: {
              userShifts: {
                where: {
                  OR: [
                    { effectiveTo: null },
                    { effectiveTo: { gte: new Date() } }
                  ]
                },
                include: {
                  setting: {
                    include: {
                      times: true
                    }
                  }
                },
                orderBy: { effectiveFrom: 'desc' },
                take: 1
              }
            }
          }
        }
      }),
      prisma.employee.count({ where: whereClause })
    ]);

    // Transform data to match frontend structure
    const schedules = employees.map(emp => {
      const userShift = emp.User?.userShifts?.[0];
      const setting = userShift?.setting;
      const times = setting?.times || [];

      // Build schedules object
      const schedulesByDay = {};
      Object.entries(dayMapping).forEach(([dayNum, dayName]) => {
        const dayTime = times.find(t => t.day === parseInt(dayNum));
        if (dayTime) {
          schedulesByDay[dayName] = {
            start: minutesToTime(dayTime.clockInMinutes),
            end: minutesToTime(dayTime.clockOutMinutes),
            isOff: dayTime.clockInMinutes === null && dayTime.clockOutMinutes === null
          };
        } else {
          schedulesByDay[dayName] = { start: null, end: null, isOff: true };
        }
      });

      return {
        id: emp.id,
        settingId: setting?.id || null,
        userShiftId: userShift?.id || null,
        employeeId: emp.employeeId,
        employeeName: `${emp.firstName}${emp.lastName ? ' ' + emp.lastName : ''}`,
        position: emp.jobdesk || '-',
        branch: emp.branch || '-',
        shiftType: setting?.name || 'Regular',
        avatar: emp.avatar || null,
        schedules: schedulesByDay,
        // 🔑 ADD TERMINATION INFO FOR FRONTEND STYLING
        isActive: emp.isActive,
        terminationType: emp.terminationType || null,
        terminatedAt: emp.terminatedAt || null,
      };
    });

    res.json({
      success: true,
      data: schedules,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Get schedules error:', err);
    res.status(500).json({ message: 'Failed to fetch schedules' });
  }
}

/**
 * Get schedule stats
 * GET /api/schedules/stats
 */
export async function getScheduleStats(req, res) {
  try {
    const { companyId } = req.user;

    const totalEmployees = await prisma.employee.count({
      where: { companyId }
    });

    // Get all shift settings used by employees
    const settings = await prisma.checkClockSetting.findMany({
      where: { isActive: true },
      include: {
        userShifts: {
          where: {
            user: { companyId },
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gte: new Date() } }
            ]
          }
        }
      }
    });

    let regularCount = 0;
    let shiftCount = 0;
    let flexibleCount = 0;

    settings.forEach(s => {
      const count = s.userShifts.length;
      const name = s.name.toLowerCase();
      
      if (name.includes('regular') || name.includes('normal')) {
        regularCount += count;
      } else if (name.includes('flexible') || name.includes('fleksibel')) {
        flexibleCount += count;
      } else {
        shiftCount += count;
      }
    });

    // Get current period
    const now = new Date();
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                       'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const period = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

    res.json({
      success: true,
      stats: {
        period,
        totalEmployees,
        regularShift: regularCount,
        shiftWorkers: shiftCount,
        flexibleWorkers: flexibleCount
      }
    });
  } catch (err) {
    console.error('Get schedule stats error:', err);
    res.status(500).json({ message: 'Failed to fetch schedule stats' });
  }
}

/**
 * Get all shift types (CheckClockSetting)
 * GET /api/schedules/shift-types
 */
export async function getShiftTypes(req, res) {
  try {
    const settings = await prisma.checkClockSetting.findMany({
      where: { isActive: true },
      include: { times: true }
    });

    const shiftTypes = settings.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      times: s.times.map(t => ({
        day: t.day,
        clockIn: minutesToTime(t.clockInMinutes),
        clockOut: minutesToTime(t.clockOutMinutes),
        breakStart: minutesToTime(t.breakStartMinutes),
        breakEnd: minutesToTime(t.breakEndMinutes)
      }))
    }));

    res.json({ success: true, data: shiftTypes });
  } catch (err) {
    console.error('Get shift types error:', err);
    res.status(500).json({ message: 'Failed to fetch shift types' });
  }
}

/**
 * Create or update shift setting
 * POST /api/schedules/shift-types
 */
export async function createShiftType(req, res) {
  try {
    const { name, type = 'regular', schedules } = req.body;

    // Create the setting
    const setting = await prisma.checkClockSetting.create({
      data: {
        name,
        type,
        isActive: true,
        times: {
          create: Object.entries(schedules).map(([dayName, schedule]) => {
            const dayNum = Object.entries(dayMapping).find(([_, name]) => name === dayName)?.[0];
            return {
              day: parseInt(dayNum),
              clockInMinutes: schedule.isOff ? null : timeToMinutes(schedule.start),
              clockOutMinutes: schedule.isOff ? null : timeToMinutes(schedule.end),
              breakStartMinutes: null,
              breakEndMinutes: null
            };
          })
        }
      },
      include: { times: true }
    });

    res.status(201).json({
      success: true,
      data: setting,
      message: 'Shift type created successfully'
    });
  } catch (err) {
    console.error('Create shift type error:', err);
    res.status(500).json({ message: 'Failed to create shift type' });
  }
}

/**
 * Assign schedule to employee
 * POST /api/schedules/assign
 */
export async function assignSchedule(req, res) {
  try {
    const { employeeId, settingId, effectiveFrom } = req.body;

    // Find employee and their user
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(employeeId) },
      include: { User: true }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (!employee.User) {
      return res.status(400).json({ message: 'Employee has no linked user account' });
    }

    // End any existing active shifts
    await prisma.userShift.updateMany({
      where: {
        userId: employee.User.id,
        effectiveTo: null
      },
      data: {
        effectiveTo: new Date()
      }
    });

    // Create new shift assignment
    const userShift = await prisma.userShift.create({
      data: {
        userId: employee.User.id,
        checkClockSettingId: parseInt(settingId),
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        effectiveTo: null
      },
      include: {
        setting: {
          include: { times: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: userShift,
      message: 'Schedule assigned successfully'
    });
  } catch (err) {
    console.error('Assign schedule error:', err);
    res.status(500).json({ message: 'Failed to assign schedule' });
  }
}

/**
 * Update employee schedule (update the shift setting times directly or reassign)
 * PUT /api/schedules/:employeeId
 */
export async function updateSchedule(req, res) {
  try {
    const { employeeId } = req.params;
    const { shiftType, schedules } = req.body;

    console.log('===== UPDATE SCHEDULE =====');
    console.log('Employee ID:', employeeId);
    console.log('Shift Type:', shiftType);
    console.log('Schedules:', JSON.stringify(schedules, null, 2));

    // Validate input
    if (!shiftType || !schedules) {
      return res.status(400).json({ 
        success: false,
        message: 'shiftType and schedules are required' 
      });
    }

    // Find employee
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(employeeId) },
      include: {
        User: {
          include: {
            userShifts: {
              where: { effectiveTo: null },
              include: { 
                setting: {
                  include: { times: true }
                } 
              },
              take: 1
            }
          }
        }
      }
    });

    if (!employee) {
      return res.status(404).json({ 
        success: false,
        message: 'Employee not found' 
      });
    }

    // Check if employee has a linked User account
    if (!employee.User) {
      return res.status(400).json({ 
        success: false,
        message: 'Karyawan ini belum memiliki akun user yang terhubung. Silakan buat akun user untuk karyawan ini terlebih dahulu.' 
      });
    }

    const currentShift = employee.User.userShifts?.[0];
    const currentSetting = currentShift?.setting;

    // Convert schedules object to times array
    const newTimes = Object.entries(schedules).map(([dayName, schedule]) => {
      const dayNum = Object.entries(dayMapping).find(([_, name]) => name === dayName)?.[0];
      return {
        day: parseInt(dayNum),
        clockInMinutes: schedule.isOff ? null : timeToMinutes(schedule.start),
        clockOutMinutes: schedule.isOff ? null : timeToMinutes(schedule.end),
        breakStartMinutes: null,
        breakEndMinutes: null
      };
    });

    // Check if current setting is used by other users
    let usersUsingCurrentSetting = 0;
    if (currentSetting) {
      usersUsingCurrentSetting = await prisma.userShift.count({
        where: {
          checkClockSettingId: currentSetting.id,
          effectiveTo: null
        }
      });
    }

    console.log('Current Setting:', currentSetting?.name, '(ID:', currentSetting?.id, ')');
    console.log('Users using this setting:', usersUsingCurrentSetting);

    let settingToUse;

    // If current setting is only used by this user, update it directly
    if (currentSetting && usersUsingCurrentSetting === 1) {
      console.log('Updating existing setting directly (single user)');
      
      // Update existing setting name if changed
      if (currentSetting.name !== shiftType) {
        await prisma.checkClockSetting.update({
          where: { id: currentSetting.id },
          data: { name: shiftType }
        });
      }

      // Delete old times and create new ones
      await prisma.checkClockSettingTime.deleteMany({
        where: { checkClockSettingId: currentSetting.id }
      });

      await prisma.checkClockSettingTime.createMany({
        data: newTimes.map(t => ({
          ...t,
          checkClockSettingId: currentSetting.id
        }))
      });

      settingToUse = currentSetting;
    } else {
      // Create a NEW custom setting for this employee (unique name)
      console.log('Creating NEW setting (shared or no existing)');
      const uniqueName = `${shiftType} - ${employee.firstName} ${employee.lastName || ''}`.trim();
      
      settingToUse = await prisma.checkClockSetting.create({
        data: {
          name: uniqueName,
          type: shiftType.toLowerCase().includes('shift') ? 'shift' : 'regular',
          isActive: true,
          times: {
            create: newTimes
          }
        }
      });

      // End current shift
      if (currentShift) {
        await prisma.userShift.update({
          where: { id: currentShift.id },
          data: { effectiveTo: new Date() }
        });
      }

      // Create new shift assignment
      await prisma.userShift.create({
        data: {
          userId: employee.User.id,
          checkClockSettingId: settingToUse.id,
          effectiveFrom: new Date(),
          effectiveTo: null
        }
      });
    }

    console.log('===== UPDATE COMPLETE =====');

    res.json({
      success: true,
      message: 'Schedule updated successfully'
    });
  } catch (err) {
    console.error('Update schedule error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update schedule: ' + (err.message || 'Unknown error') 
    });
  }
}

/**
 * Remove schedule from employee (end the shift)
 * DELETE /api/schedules/:employeeId
 */
export async function deleteSchedule(req, res) {
  try {
    const { employeeId } = req.params;

    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(employeeId) },
      include: { User: true }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (employee.User) {
      // End all active shifts for this user
      await prisma.userShift.updateMany({
        where: {
          userId: employee.User.id,
          effectiveTo: null
        },
        data: { effectiveTo: new Date() }
      });
    }

    res.json({
      success: true,
      message: 'Schedule removed successfully'
    });
  } catch (err) {
    console.error('Delete schedule error:', err);
    res.status(500).json({ message: 'Failed to delete schedule' });
  }
}

/**
 * Get employees without schedules (for assignment)
 * GET /api/schedules/unassigned-employees
 */
export async function getUnassignedEmployees(req, res) {
  try {
    const { companyId } = req.user;

    // Get employees that:
    // 1. Belong to this company
    // 2. Have a linked User account (required for schedule assignment)
    // 3. Don't have any active schedule (no userShifts with null effectiveTo)
    const employees = await prisma.employee.findMany({
      where: {
        companyId,
        User: {
          isNot: null // Must have a linked User account
        }
      },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        jobdesk: true,
        branch: true,
        User: {
          select: {
            id: true,
            userShifts: {
              where: {
                effectiveTo: null
              },
              select: {
                id: true
              }
            }
          }
        }
      }
    });

    // Filter employees that don't have active shifts
    const unassignedEmployees = employees.filter(emp => {
      return !emp.User?.userShifts || emp.User.userShifts.length === 0;
    });

    res.json({
      success: true,
      data: unassignedEmployees.map(e => ({
        id: e.id,
        employeeId: e.employeeId,
        name: `${e.firstName}${e.lastName ? ' ' + e.lastName : ''}`,
        position: e.jobdesk || '-',
        branch: e.branch || '-'
      }))
    });
  } catch (err) {
    console.error('Get unassigned employees error:', err);
    res.status(500).json({ message: 'Failed to fetch unassigned employees' });
  }
}
