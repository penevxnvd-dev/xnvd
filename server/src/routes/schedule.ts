import express from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRealtor, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get schedule for a week (by date)
router.get('/week', authenticate, requireRealtor, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { date } = req.query; // ISO date string

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // Get realtor ID
    const realtor = await prisma.realtor.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!realtor) {
      return res.status(404).json({ error: 'Realtor not found' });
    }

    const startDate = new Date(date as string);
    startDate.setHours(0, 0, 0, 0);
    
    // Get Monday of the week
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(startDate.setDate(diff));
    
    // Get Sunday of the week
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const schedule = await prisma.buyerSchedule.findMany({
      where: {
        realtorId: realtor.id,
        scheduleDate: {
          gte: monday,
          lte: sunday
        }
      },
      orderBy: [
        { scheduleDate: 'asc' },
        { timeSlot: 'asc' }
      ]
    });

    res.json(schedule.map(s => ({
      id: s.id,
      realtor_id: s.realtorId,
      schedule_date: s.scheduleDate.toISOString().split('T')[0],
      time_slot: s.timeSlot,
      buyer1_name: s.buyer1Name,
      buyer1_phone: s.buyer1Phone,
      buyer1_notes: s.buyer1Notes,
      buyer2_name: s.buyer2Name,
      buyer2_phone: s.buyer2Phone,
      buyer2_notes: s.buyer2Notes
    })));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Get schedule for specific date
router.get('/date/:date', authenticate, requireRealtor, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { date } = req.params;

    // Get realtor ID
    const realtor = await prisma.realtor.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!realtor) {
      return res.status(404).json({ error: 'Realtor not found' });
    }

    const schedule = await prisma.buyerSchedule.findMany({
      where: {
        realtorId: realtor.id,
        scheduleDate: new Date(date)
      },
      orderBy: { timeSlot: 'asc' }
    });

    res.json(schedule.map(s => ({
      id: s.id,
      realtor_id: s.realtorId,
      schedule_date: s.scheduleDate.toISOString().split('T')[0],
      time_slot: s.timeSlot,
      buyer1_name: s.buyer1Name,
      buyer1_phone: s.buyer1Phone,
      buyer1_notes: s.buyer1Notes,
      buyer2_name: s.buyer2Name,
      buyer2_phone: s.buyer2Phone,
      buyer2_notes: s.buyer2Notes
    })));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Create or update schedule entry
router.post('/', authenticate, requireRealtor, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const {
      scheduleDate,
      timeSlot,
      buyer1Name,
      buyer1Phone,
      buyer1Notes,
      buyer2Name,
      buyer2Phone,
      buyer2Notes,
      id // If provided, update existing
    } = req.body;

    if (!scheduleDate || !timeSlot) {
      return res.status(400).json({ error: 'Schedule date and time slot are required' });
    }

    // Get realtor ID
    const realtor = await prisma.realtor.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!realtor) {
      return res.status(404).json({ error: 'Realtor not found' });
    }

    let result;
    if (id) {
      // Update existing
      result = await prisma.buyerSchedule.update({
        where: { id },
        data: {
          scheduleDate: new Date(scheduleDate),
          timeSlot,
          buyer1Name: buyer1Name || null,
          buyer1Phone: buyer1Phone || null,
          buyer1Notes: buyer1Notes || null,
          buyer2Name: buyer2Name || null,
          buyer2Phone: buyer2Phone || null,
          buyer2Notes: buyer2Notes || null
        }
      });
    } else {
      // Create new
      result = await prisma.buyerSchedule.create({
        data: {
          realtorId: realtor.id,
          scheduleDate: new Date(scheduleDate),
          timeSlot,
          buyer1Name: buyer1Name || null,
          buyer1Phone: buyer1Phone || null,
          buyer1Notes: buyer1Notes || null,
          buyer2Name: buyer2Name || null,
          buyer2Phone: buyer2Phone || null,
          buyer2Notes: buyer2Notes || null
        }
      });
    }

    res.json({
      id: result.id,
      realtor_id: result.realtorId,
      schedule_date: result.scheduleDate.toISOString().split('T')[0],
      time_slot: result.timeSlot,
      buyer1_name: result.buyer1Name,
      buyer1_phone: result.buyer1Phone,
      buyer1_notes: result.buyer1Notes,
      buyer2_name: result.buyer2Name,
      buyer2_phone: result.buyer2Phone,
      buyer2_notes: result.buyer2Notes
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Delete schedule entry
router.delete('/:id', authenticate, requireRealtor, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // Get realtor ID
    const realtor = await prisma.realtor.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!realtor) {
      return res.status(404).json({ error: 'Realtor not found' });
    }

    // Verify the schedule belongs to this realtor before deleting
    const schedule = await prisma.buyerSchedule.findUnique({
      where: { id },
      select: { realtorId: true }
    });

    if (!schedule || schedule.realtorId !== realtor.id) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    await prisma.buyerSchedule.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;

