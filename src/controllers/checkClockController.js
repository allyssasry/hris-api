import { prisma } from '../utils/prisma.js';

export const list = async (req, res) => {
  const where = { deletedAt: null };
  if (req.query.userId) where.userId = Number(req.query.userId);
  const data = await prisma.checkClock.findMany({ where, orderBy: { time: 'desc' } });
  res.json(data);
};

export const create = async (req, res) => {
  const { userId, checkType, time, note } = req.body;
  const record = await prisma.checkClock.create({
    data: { userId, checkType, time: time ? new Date(time) : undefined, note }
  });
  res.json(record);
};
