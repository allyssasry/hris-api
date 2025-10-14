import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { listFormats, createFormat, listLetters, createLetter } from '../controllers/letterController.js';

const r = Router();
r.use(auth(true));
r.get('/formats', listFormats);
r.post('/formats', createFormat);
r.get('/', listLetters);
r.post('/', createLetter);
export default r;
