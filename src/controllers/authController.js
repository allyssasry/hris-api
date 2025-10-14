import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma.js';
import { signUpSchema, signInSchema, employeeSignInSchema } from '../validators/authSchemas.js';

function issueJWT(user) {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export const signUp = async (req, res) => {
  const parse = signUpSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ errors: parse.error.flatten() });

  const { firstName, lastName, email, username, password } = parse.data;
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username: username || '' }] }
  });
  if (existing) return res.status(409).json({ message: 'email atau username sudah digunakan' });

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { firstName, lastName, email: email.toLowerCase(), username: username || null, password: hash }
  });

  const token = issueJWT(user);
  res.json({ token, user: { id: user.id, email: user.email, username: user.username, firstName, lastName } });
};

export const signIn = async (req, res) => {
  const parse = signInSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ errors: parse.error.flatten() });

  const { identifier, password } = parse.data;
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier.toLowerCase() }, { username: identifier }] }
  });
  if (!user || !user.password) return res.status(401).json({ message: 'kredensial salah' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: 'kredensial salah' });

  const token = issueJWT(user);
  res.json({ token });
};

export const signInEmployee = async (req, res) => {
  const parse = employeeSignInSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ errors: parse.error.flatten() });

  const { companyUser, employeeId, password } = parse.data;

  const cred = await prisma.employeeCredential.findUnique({
    where: { companyUser_empCode: { companyUser, empCode: employeeId } },
    include: { employee: { include: { user: true } } }
  });
  if (!cred || !cred.isActive) return res.status(401).json({ message: 'kredensial karyawan salah' });

  const ok = await bcrypt.compare(password, cred.password);
  if (!ok) return res.status(401).json({ message: 'kredensial karyawan salah' });

  let user = cred.employee.user;
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: `${companyUser}.${employeeId}@employee.local`,
        firstName: cred.employee.firstName,
        lastName: cred.employee.lastName
      }
    });
    await prisma.employee.update({ where: { id: cred.employeeId }, data: { userId: user.id } });
  }

  const token = issueJWT(user);
  res.json({ token });
};
