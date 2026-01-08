// src/controllers/leave.controller.js
import { prisma } from '../utils/prisma.js';

export const LeaveController = {
  // POST /api/leaves
  async create(req, res) {
    try {
      const { parseLeave } = await import('../validators/leave.schema.js');
      const parsed = parseLeave(req.body);
      if (!parsed.ok) {
        return res.status(422).json({ message: 'Validation error', errors: parsed.errors });
      }

      const { data } = parsed;
      const attachment = req.file ? `/uploads/${req.file.filename}` : undefined;

      const created = await prisma.leave.create({
        data: {
          userId: req.user.id,
          type: data.type,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          note: data.note,
          attachment,          // ← ini memang ada di model Leave
          status: 'PENDING',
        },
        select: { id: true, type: true, startDate: true, endDate: true, status: true },
      });

      return res.status(201).json(created);
    } catch (e) {
      console.error('create leave error', e);
      if (String(e.message || '').includes('boundary')) {
        return res.status(400).json({
          message:
            'Invalid multipart: boundary not found. Gunakan Body → form-data (jangan set Content-Type manual).',
        });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  // GET /api/leaves?mine=1
  async list(req, res) {
    try {
      const mine = String(req.query.mine || '') === '1';
      const where = mine ? { userId: req.user.id } : {};

      const list = await prisma.leave.findMany({
        where,
        orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
        select: { id: true, type: true, startDate: true, endDate: true, status: true, userId: true },
      });

      return res.json(list);
    } catch (e) {
      console.error('list leaves error', e);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
};
