import express from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRealtor, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get diagnoses for current realtor
router.get('/me', authenticate, requireRealtor, async (req: AuthRequest, res) => {
  try {
    const realtor = await prisma.realtor.findUnique({
      where: { userId: req.userId! },
      select: { id: true }
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

    res.json(diagnoses.map(d => ({
      id: d.id,
      realtor_id: d.realtorId,
      client_name: d.clientName,
      diagnosis_date: d.diagnosisDate.toISOString().split('T')[0],
      status: d.status,
      notes: d.notes,
      created_at: d.createdAt.toISOString()
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create diagnosis
router.post('/', authenticate, requireRealtor, async (req: AuthRequest, res) => {
  try {
    const realtor = await prisma.realtor.findUnique({
      where: { userId: req.userId! },
      select: { id: true }
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
        notes: notes || null,
        diagnosisDate: diagnosisDate ? new Date(diagnosisDate) : new Date()
      }
    });

    res.json({
      id: diagnosis.id,
      realtor_id: diagnosis.realtorId,
      client_name: diagnosis.clientName,
      diagnosis_date: diagnosis.diagnosisDate.toISOString().split('T')[0],
      status: diagnosis.status,
      notes: diagnosis.notes,
      created_at: diagnosis.createdAt.toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

