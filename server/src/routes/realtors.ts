import express from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireAdmin, requireRealtor, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

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
            email: true,
          },
        },
      },
      orderBy: { level: 'desc' },
    });

    res.json(realtors.map(r => ({
      ...r,
      salesResilience: r.salesResilience,
      successMindset: r.successMindset,
      profile: {
        full_name: r.user.fullName,
        email: r.user.email,
      },
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get current realtor (own profile)
router.get('/me', authenticate, requireRealtor, async (req: AuthRequest, res) => {
  try {
    console.log('[Realtors /me] userId:', req.userId);
    console.log('[Realtors /me] userRole:', req.userRole);
    
    const realtor = await prisma.realtor.findUnique({
      where: { userId: req.userId! },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
        team: {
          include: {
            leader: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    console.log('[Realtors /me] realtor found:', !!realtor);
    
    if (!realtor) {
      console.log('[Realtors /me] No realtor found for userId:', req.userId);
      return res.status(404).json({ error: 'Realtor not found' });
    }

    // Transform to match frontend expectations
    res.json({
      id: realtor.id,
      userId: realtor.userId,
      teamId: realtor.teamId,
      level: realtor.level,
      hireDate: realtor.hireDate,
      confidence: realtor.confidence,
      salesResilience: realtor.salesResilience,
      successMindset: realtor.successMindset,
      createdAt: realtor.createdAt,
      updatedAt: realtor.updatedAt,
      user: {
        id: realtor.user.id,
        fullName: realtor.user.fullName,
        email: realtor.user.email,
      },
      profile: {
        full_name: realtor.user.fullName,
        email: realtor.user.email,
      },
      team: realtor.team ? {
        id: realtor.team.id,
        name: realtor.team.name,
        officeId: realtor.team.officeId,
        leaderId: realtor.team.leaderId,
        leader: realtor.team.leader ? {
          fullName: realtor.team.leader.fullName,
          email: realtor.team.leader.email,
        } : null,
      } : null,
    });
  } catch (error: any) {
    console.error('[Realtors /me] Error:', error);
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
        successMindset: successMindset || false,
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    res.json({
      ...realtor,
      salesResilience: realtor.salesResilience,
      successMindset: realtor.successMindset,
      profile: {
        full_name: realtor.user.fullName,
        email: realtor.user.email,
      },
    });
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
        successMindset,
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    res.json({
      ...realtor,
      salesResilience: realtor.salesResilience,
      successMindset: realtor.successMindset,
      profile: {
        full_name: realtor.user.fullName,
        email: realtor.user.email,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

