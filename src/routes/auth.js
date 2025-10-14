import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { signUp, signIn, signInEmployee } from '../controllers/authController.js';
import { googleSignIn } from '../controllers/googleAuthController.js';
import { me } from '../controllers/authMeController.js';

const r = Router();
r.post('/signup', signUp);
r.post('/signin', signIn);
r.post('/signin/employee', signInEmployee);
r.post('/google', googleSignIn);
r.get('/me', auth(true), me);
export default r;
