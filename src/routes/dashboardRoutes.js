// src/routes/dashboardRoutes.js
import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { getMyDashboard } from '../controllers/dashboardController.js';

const r = Router();
r.get('/me', auth(true), getMyDashboard);
export default r;
