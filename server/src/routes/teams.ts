import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get teams by office
router.get('/office/:officeId', authenticate, async (req, res) => {
  try {
    const { officeId } = req.params;
    const teams = await prisma.team.findMany({
      where: { officeId },
      orderBy: { name: 'asc' }
    });
    res.json(teams);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create team
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, officeId, leaderId } = req.body;
    const team = await prisma.team.create({
      data: { name, officeId, leaderId }
    });
    res.json(team);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update team
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, leaderId } = req.body;
    const team = await prisma.team.update({
      where: { id },
      data: { name, leaderId }
    });
    res.json(team);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete team
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.team.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

