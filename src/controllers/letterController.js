import { prisma } from '../utils/prisma.js';

export const listFormats = async (req, res) => {
  const data = await prisma.letterFormat.findMany({ where: { deletedAt: null } });
  res.json(data);
};
export const createFormat = async (req, res) => {
  const data = await prisma.letterFormat.create({ data: req.body });
  res.json(data);
};
export const listLetters = async (req, res) => {
  const data = await prisma.letter.findMany({ where: { deletedAt: null }, include: { format: true } });
  res.json(data);
};
export const createLetter = async (req, res) => {
  const data = await prisma.letter.create({ data: req.body });
  res.json(data);
};
