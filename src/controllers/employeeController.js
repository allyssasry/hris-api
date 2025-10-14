import { prisma } from '../utils/prisma.js';

export const list = async (req, res) => {
  const data = await prisma.employee.findMany({ where: { deletedAt: null } });
  res.json(data);
};
export const create = async (req, res) => {
  const data = await prisma.employee.create({ data: req.body });
  res.json(data);
};
export const getOne = async (req, res) => {
  const data = await prisma.employee.findUnique({ where: { id: Number(req.params.id) } });
  if (!data) return res.status(404).json({ message: 'not found' });
  res.json(data);
};
export const update = async (req, res) => {
  const data = await prisma.employee.update({ where: { id: Number(req.params.id) }, data: req.body });
  res.json(data);
};
export const remove = async (req, res) => {
  const data = await prisma.employee.update({ where: { id: Number(req.params.id) }, data: { deletedAt: new Date() } });
  res.json({ message: 'soft deleted', data });
};
