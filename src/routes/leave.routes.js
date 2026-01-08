// src/routes/leave.routes.js
import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { upload } from '../utils/upload.js';
import { LeaveController } from '../controllers/leave.controller.js';

const r = Router();

r.post('/api/leaves', auth(), upload.single('attachment'), LeaveController.create);
r.get('/api/leaves', auth(), LeaveController.list);

export default r;
