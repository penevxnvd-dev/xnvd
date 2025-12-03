import express from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get offices by city
router.get('/city/:cityId', authenticate, async (req, res) => {
  try {
    const { cityId } = req.params;
    const offices = await prisma.office.findMany({
      where: { cityId },
      orderBy: { name: 'asc' }
    });
    res.json(offices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all offices with full structure - MUST be before /:id/full to avoid route conflict
router.get('/all/full', authenticate, async (req, res) => {
  try {
    // Get all offices with city and country from Prisma
    const offices = await prisma.office.findMany({
      include: {
        city: {
          include: {
            country: true
          }
        },
        teams: {
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
        }
      },
      orderBy: { name: 'asc' }
    });

    // Transform to match frontend expectations
    const transformed = offices.map(office => ({
      ...office,
      city_id: office.cityId,
      city: {
        ...office.city,
        country_id: office.city.countryId,
        country: office.city.country
      },
      teams: office.teams.map(team => ({
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
      }))
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Error in /all/full:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get office with full structure (teams, leaders, realtors, deals)
router.get('/:id/full', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const office = await prisma.office.findUnique({
      where: { id },
      include: {
        city: {
          include: {
            country: true
          }
        },
        teams: {
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
        }
      }
    });

    if (!office) {
      return res.status(404).json({ error: 'Office not found' });
    }

    // Transform to match frontend expectations
    const transformed = {
      ...office,
      city_id: office.cityId,
      city: {
        ...office.city,
        country_id: office.city.countryId,
        country: office.city.country
      },
      teams: office.teams.map(team => ({
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
      }))
    };

    res.json(transformed);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create office
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, cityId, address } = req.body;
    const office = await prisma.office.create({
      data: { name, cityId, address }
    });
    res.json(office);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update office
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, address } = req.body;
    const office = await prisma.office.update({
      where: { id },
      data: { name, address }
    });
    res.json(office);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete office
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.office.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
