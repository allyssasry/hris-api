import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import * as c from '../controllers/checkClockController.js';

const r = Router();
r.use(auth(true));
r.get('/', c.list);
r.post('/', c.create);
export default r;
