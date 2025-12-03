import express from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRealtor, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get current month goals for realtor
router.get('/me', authenticate, requireRealtor, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    
    // Get realtor ID using Prisma
    const { prisma } = await import('../lib/prisma.js');
    const realtor = await prisma.realtor.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!realtor) {
      return res.status(404).json({ error: 'Realtor not found' });
    }

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const goal = await prisma.realtorGoal.findUnique({
      where: {
        realtorId_month_year: {
          realtorId: realtor.id,
          month,
          year
        }
      }
    });

    // If no goal exists, return default
    if (!goal) {
      return res.json({
        month,
        year,
        dealsGoal: 0,
        keysGoal: 0,
        exclusivesGoal: 0
      });
    }

    res.json({
      id: goal.id,
      month: goal.month,
      year: goal.year,
      dealsGoal: goal.dealsGoal,
      keysGoal: goal.keysGoal,
      exclusivesGoal: goal.exclusivesGoal
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get goals for specific month
router.get('/:month/:year', authenticate, requireRealtor, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const month = parseInt(req.params.month);
    const year = parseInt(req.params.year);

    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid month' });
    }

    // Get realtor ID
    const realtor = await prisma.realtor.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!realtor) {
      return res.status(404).json({ error: 'Realtor not found' });
    }

    const goal = await prisma.realtorGoal.findUnique({
      where: {
        realtorId_month_year: {
          realtorId: realtor.id,
          month,
          year
        }
      }
    });

    if (!goal) {
      return res.json({
        month,
        year,
        dealsGoal: 0,
        keysGoal: 0,
        exclusivesGoal: 0
      });
    }

    res.json({
      id: goal.id,
      month: goal.month,
      year: goal.year,
      dealsGoal: goal.dealsGoal,
      keysGoal: goal.keysGoal,
      exclusivesGoal: goal.exclusivesGoal
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create or update goals
router.post('/', authenticate, requireRealtor, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { month, year, dealsGoal, keysGoal, exclusivesGoal } = req.body;

    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid month' });
    }

    // Get realtor ID
    const realtor = await prisma.realtor.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!realtor) {
      return res.status(404).json({ error: 'Realtor not found' });
    }

    // Upsert goal
    const goal = await prisma.realtorGoal.upsert({
      where: {
        realtorId_month_year: {
          realtorId: realtor.id,
          month,
          year
        }
      },
      update: {
        dealsGoal: dealsGoal || 0,
        keysGoal: keysGoal || 0,
        exclusivesGoal: exclusivesGoal || 0
      },
      create: {
        realtorId: realtor.id,
        month,
        year,
        dealsGoal: dealsGoal || 0,
        keysGoal: keysGoal || 0,
        exclusivesGoal: exclusivesGoal || 0
      }
    });

    res.json({
      id: goal.id,
      month: goal.month,
      year: goal.year,
      dealsGoal: goal.dealsGoal,
      keysGoal: goal.keysGoal,
      exclusivesGoal: goal.exclusivesGoal
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

