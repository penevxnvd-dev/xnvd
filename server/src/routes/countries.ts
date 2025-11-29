import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all countries
router.get('/', authenticate, async (req, res) => {
  try {
    const countries = await prisma.country.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(countries);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create country
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, code } = req.body;
    const country = await prisma.country.create({
      data: { name, code }
    });
    res.json(country);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update country
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;
    const country = await prisma.country.update({
      where: { id },
      data: { name, code }
    });
    res.json(country);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete country
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.country.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

