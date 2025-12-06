import express from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRealtor, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get deals for current realtor
router.get('/me', authenticate, requireRealtor, async (req: AuthRequest, res) => {
  try {
    const realtor = await prisma.realtor.findUnique({
      where: { userId: req.userId! },
      select: { id: true }
    });

    if (!realtor) {
      return res.status(404).json({ error: 'Realtor not found' });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const deals = await prisma.deal.findMany({
      where: {
        realtorId: realtor.id,
        dealDate: {
          gte: startOfMonth
        }
      },
      orderBy: { dealDate: 'desc' }
    });

    res.json(deals.map(deal => ({
      id: deal.id,
      realtor_id: deal.realtorId,
      client_name: deal.clientName,
      deal_value: deal.dealValue,
      commission: deal.commission,
      deal_date: deal.dealDate.toISOString().split('T')[0],
      is_key: deal.isKey,
      is_exclusive: deal.isExclusive
    })));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Get all deals (admin only)
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { data: deals, error } = await supabaseAdmin
      .from('deals')
      .select(`
        *,
        realtor:realtors (
          *,
          profile:profiles!realtors_user_id_fkey (
            full_name,
            email
          )
        )
      `)
      .order('deal_date', { ascending: false });

    if (error) throw error;
    res.json(deals || []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Create deal
router.post('/', authenticate, requireRealtor, async (req: AuthRequest, res) => {
  try {
    const { data: realtor, error: realtorError } = await supabaseAdmin
      .from('realtors')
      .select('id')
      .eq('user_id', req.userId!)
      .single();

    if (realtorError || !realtor) {
      return res.status(404).json({ error: 'Realtor not found' });
    }

    const { clientName, dealValue, commission, dealDate } = req.body;
    const { data: deal, error } = await supabaseAdmin
      .from('deals')
      .insert({
        realtor_id: realtor.id,
        client_name: clientName,
        deal_value: parseFloat(dealValue),
        commission: commission ? parseFloat(commission) : null,
        deal_date: dealDate ? dealDate : new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (error) throw error;
    res.json(deal);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;

