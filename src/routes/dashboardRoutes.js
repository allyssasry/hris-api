// src/routes/dashboardRoutes.js
import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { getMyDashboard } from '../controllers/dashboardController.js';
import { 
  getAdminDashboardStats, 
  getEmployeeChartData,
  getStatusChartData,
  getAttendanceChartData
} from '../controllers/adminDashboardController.js';

const r = Router();

// User dashboard
r.get('/me', auth(true), getMyDashboard);

// Admin dashboard endpoints
r.get('/admin/stats', auth(true), getAdminDashboardStats);
r.get('/admin/employee-chart', auth(true), getEmployeeChartData);
r.get('/admin/status-chart', auth(true), getStatusChartData);
r.get('/admin/attendance-chart', auth(true), getAttendanceChartData);

export default r;
