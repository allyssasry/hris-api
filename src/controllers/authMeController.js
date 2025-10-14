import { prisma } from '../utils/prisma.js';
export const me = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, username: true, firstName: true, lastName: true, isAdmin: true }
  });
  res.json(user);
};
