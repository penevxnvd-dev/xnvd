import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

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
                user: true,
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

    res.json(office);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all offices with full structure
router.get('/all/full', authenticate, async (req, res) => {
  try {
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
                user: true,
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

    res.json(offices);
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

