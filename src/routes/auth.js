import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { signUp, signIn, employeeSignIn } from '../controllers/authController.js';
import { googleSignIn } from '../controllers/googleAuthController.js';
import { me } from '../controllers/authMeController.js';

const r = Router();
r.post('/signup', signUp);
r.post('/login', signIn);
r.post("/employee/signin", employeeSignIn);
r.post('/google', googleSignIn);
r.get('/me', auth(true), me);
export default r;
