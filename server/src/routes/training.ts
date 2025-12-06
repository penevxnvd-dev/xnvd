import express from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRealtor, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get training progress
router.get('/progress', authenticate, requireRealtor, async (req: AuthRequest, res) => {
  try {
    const realtor = await prisma.realtor.findUnique({
      where: { userId: req.userId! }
    });

    if (!realtor) {
      return res.status(404).json({ error: 'Realtor not found' });
    }

    const progress = await prisma.trainingProgress.findMany({
      where: { realtorId: realtor.id }
    });

    res.json(progress);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Update training progress
router.put('/progress', authenticate, requireRealtor, async (req: AuthRequest, res) => {
  try {
    const realtor = await prisma.realtor.findUnique({
      where: { userId: req.userId! }
    });

    if (!realtor) {
      return res.status(404).json({ error: 'Realtor not found' });
    }

    const { section, subsection, lectureCompleted, videoCompleted, practicalCompleted, handoverCompleted, examCompleted } = req.body;

    const progress = await prisma.trainingProgress.upsert({
      where: {
        realtorId_section_subsection: {
          realtorId: realtor.id,
          section,
          subsection
        }
      },
      update: {
        lectureCompleted,
        videoCompleted,
        practicalCompleted,
        handoverCompleted,
        examCompleted
      },
      create: {
        realtorId: realtor.id,
        section,
        subsection,
        lectureCompleted: lectureCompleted || false,
        videoCompleted: videoCompleted || false,
        practicalCompleted: practicalCompleted || false,
        handoverCompleted: handoverCompleted || false,
        examCompleted: examCompleted || false
      }
    });

    res.json(progress);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;

