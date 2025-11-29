import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin, requireRealtor, AuthRequest } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get realtors by team
router.get('/team/:teamId', authenticate, async (req, res) => {
  try {
    const { teamId } = req.params;
    const realtors = await prisma.realtor.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            fullName: true,
            email: true
          }
        }
      },
      orderBy: { level: 'desc' }
    });
    res.json(realtors);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get current realtor (own profile)
router.get('/me', authenticate, requireRealtor, async (req: AuthRequest, res) => {
  try {
    const realtor = await prisma.realtor.findUnique({
      where: { userId: req.userId! },
      include: {
        user: {
          select: {
            fullName: true,
            email: true
          }
        }
      }
    });

    if (!realtor) {
      return res.status(404).json({ error: 'Realtor not found' });
    }

    // Transform to match frontend expectations
    res.json({
      ...realtor,
      salesResilience: realtor.salesResilience,
      successMindset: realtor.successMindset
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create realtor (admin only)
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { userId, teamId, level, confidence, salesResilience, successMindset } = req.body;
    const realtor = await prisma.realtor.create({
      data: {
        userId,
        teamId,
        level: level || 1,
        confidence: confidence || false,
        salesResilience: salesResilience || false,
        successMindset: successMindset || false
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true
          }
        }
      }
    });
    res.json(realtor);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update realtor
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { teamId, level, confidence, salesResilience, successMindset } = req.body;
    const realtor = await prisma.realtor.update({
      where: { id },
      data: {
        teamId,
        level,
        confidence,
        salesResilience,
        successMindset
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true
          }
        }
      }
    });
    res.json(realtor);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

