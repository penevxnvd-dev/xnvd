import express from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get teams by office
router.get('/office/:officeId', authenticate, async (req, res) => {
  try {
    const { officeId } = req.params;
    const teams = await prisma.team.findMany({
      where: { officeId },
      orderBy: { name: 'asc' }
    });
    res.json(teams);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Get team with full data (leader and realtors)
router.get('/:id/full', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        leader: {
          include: {
            realtor: true
          }
        },
        realtors: {
          include: {
            user: true,
            deals: true,
            diagnoses: true
          }
        }
      }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Transform to match frontend expectations
    const transformed = {
      ...team,
      office_id: team.officeId,
      leader_id: team.leaderId,
      leader: team.leader ? {
        ...team.leader,
        realtor: team.leader.realtor
      } : null,
      realtors: team.realtors.map(realtor => ({
        ...realtor,
        user_id: realtor.userId,
        team_id: realtor.teamId,
        profile: realtor.user,
        deals: realtor.deals,
        diagnoses: realtor.diagnoses
      }))
    };

    res.json(transformed);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
