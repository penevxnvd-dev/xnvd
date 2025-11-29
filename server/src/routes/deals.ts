import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRealtor, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get deals for current realtor
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

    const deals = await prisma.deal.findMany({
      where: {
        realtorId: realtor.id,
        dealDate: {
          gte: startOfMonth
        }
      },
      orderBy: { dealDate: 'desc' }
    });

    res.json(deals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all deals (admin only)
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const deals = await prisma.deal.findMany({
      include: {
        realtor: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { dealDate: 'desc' }
    });
    res.json(deals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create deal
router.post('/', authenticate, requireRealtor, async (req: AuthRequest, res) => {
  try {
    const realtor = await prisma.realtor.findUnique({
      where: { userId: req.userId! }
    });

    if (!realtor) {
      return res.status(404).json({ error: 'Realtor not found' });
    }

    const { clientName, dealValue, commission, dealDate } = req.body;
    const deal = await prisma.deal.create({
      data: {
        realtorId: realtor.id,
        clientName,
        dealValue: parseFloat(dealValue),
        commission: commission ? parseFloat(commission) : null,
        dealDate: dealDate ? new Date(dealDate) : new Date()
      }
    });

    res.json(deal);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

