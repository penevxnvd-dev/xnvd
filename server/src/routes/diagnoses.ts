import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRealtor, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get diagnoses for current realtor
router.get('/me', authenticate, requireRealtor, async (req: AuthRequest, res) => {
  try {
    const realtor = await prisma.realtor.findUnique({
      where: { userId: req.userId! }
    });

    if (!realtor) {
      return res.status(404).json({ error: 'Realtor not found' });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const diagnoses = await prisma.diagnosis.findMany({
      where: {
        realtorId: realtor.id,
        diagnosisDate: {
          gte: startOfMonth
        }
      },
      orderBy: { diagnosisDate: 'desc' }
    });

    res.json(diagnoses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create diagnosis
router.post('/', authenticate, requireRealtor, async (req: AuthRequest, res) => {
  try {
    const realtor = await prisma.realtor.findUnique({
      where: { userId: req.userId! }
    });

    if (!realtor) {
      return res.status(404).json({ error: 'Realtor not found' });
    }

    const { clientName, status, notes, diagnosisDate } = req.body;
    const diagnosis = await prisma.diagnosis.create({
      data: {
        realtorId: realtor.id,
        clientName,
        status: status || 'active',
        notes,
        diagnosisDate: diagnosisDate ? new Date(diagnosisDate) : new Date()
      }
    });

    res.json(diagnosis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

