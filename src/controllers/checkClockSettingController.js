import { prisma } from '../utils/prisma.js';

export const list = async (req, res) => {
  const data = await prisma.checkClockSetting.findMany({ where: { deletedAt: null }, include: { times: true } });
  res.json(data);
};

export const create = async (req, res) => {
  const { name, type, isActive, times } = req.body;
  const setting = await prisma.checkClockSetting.create({
    data: { name, type, isActive: isActive ?? true, times: times ? { create: times } : undefined }
  });
  res.json(setting);
};

export const addTimes = async (req, res) => {
  const id = Number(req.params.id);
  const { times } = req.body;
  const creates = await prisma.$transaction(
    times.map(t => prisma.checkClockSettingTime.create({ data: { ...t, checkClockSettingId: id } }))
  );
  res.json(creates);
};
