import express from 'express';
import { auth, requireAdmin } from '../middlewares/auth.js';
import {
  getAllSchedules,
  getScheduleStats,
  getShiftTypes,
  createShiftType,
  assignSchedule,
  updateSchedule,
  deleteSchedule,
  getUnassignedEmployees
} from '../controllers/scheduleController.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(auth());
router.use(requireAdmin);

// GET /api/schedules - Get all schedules
router.get('/', getAllSchedules);

// GET /api/schedules/stats - Get schedule statistics
router.get('/stats', getScheduleStats);

// GET /api/schedules/shift-types - Get all shift types
router.get('/shift-types', getShiftTypes);

// POST /api/schedules/shift-types - Create new shift type
router.post('/shift-types', createShiftType);

// GET /api/schedules/unassigned-employees - Get employees without schedules
router.get('/unassigned-employees', getUnassignedEmployees);

// POST /api/schedules/assign - Assign schedule to employee
router.post('/assign', assignSchedule);

// PUT /api/schedules/:employeeId - Update employee schedule
router.put('/:employeeId', updateSchedule);

// DELETE /api/schedules/:employeeId - Remove schedule from employee
router.delete('/:employeeId', deleteSchedule);

export default router;
