import express from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get cities by country
router.get('/country/:countryId', authenticate, async (req, res) => {
  try {
    const { countryId } = req.params;
    const cities = await prisma.city.findMany({
      where: { countryId },
      orderBy: { name: 'asc' }
    });
    res.json(cities);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Create city
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, countryId } = req.body;
    const city = await prisma.city.create({
      data: { name, countryId }
    });
    res.json(city);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Update city
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const city = await prisma.city.update({
      where: { id },
      data: { name }
    });
    res.json(city);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Delete city
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.city.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;

