import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import * as c from '../controllers/salaryController.js';

const r = Router();
r.use(auth(true));
r.get('/', c.list);
r.post('/', c.create);
r.get('/:id', c.getOne);
r.put('/:id', c.update);
r.delete('/:id', c.remove);
export default r;
