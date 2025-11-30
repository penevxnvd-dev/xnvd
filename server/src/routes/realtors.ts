import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate, requireAdmin, requireRealtor, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get realtors by team
router.get('/team/:teamId', authenticate, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { data: realtors, error } = await supabaseAdmin
      .from('realtors')
      .select(`
        *,
        profile:profiles!realtors_user_id_fkey (
          full_name,
          email
        )
      `)
      .eq('team_id', teamId)
      .order('level', { ascending: false });

    if (error) throw error;
    res.json(realtors || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get current realtor (own profile)
router.get('/me', authenticate, requireRealtor, async (req: AuthRequest, res) => {
  try {
    const { data: realtor, error } = await supabaseAdmin
      .from('realtors')
      .select(`
        *,
        profile:profiles!realtors_user_id_fkey (
          full_name,
          email
        )
      `)
      .eq('user_id', req.userId!)
      .single();

    if (error || !realtor) {
      return res.status(404).json({ error: 'Realtor not found' });
    }

    // Transform to match frontend expectations
    res.json({
      ...realtor,
      salesResilience: realtor.sales_resilience,
      successMindset: realtor.success_mindset,
      user: {
        fullName: realtor.profile?.full_name,
        email: realtor.profile?.email
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create realtor (admin only)
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { userId, teamId, level, confidence, salesResilience, successMindset } = req.body;
    const { data: realtor, error } = await supabaseAdmin
      .from('realtors')
      .insert({
        user_id: userId,
        team_id: teamId,
        level: level || 1,
        confidence: confidence || false,
        sales_resilience: salesResilience || false,
        success_mindset: successMindset || false
      })
      .select(`
        *,
        profile:profiles!realtors_user_id_fkey (
          full_name,
          email
        )
      `)
      .single();

    if (error) throw error;
    res.json(realtor);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update realtor
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { teamId, level, confidence, salesResilience, successMindset } = req.body;
    const { data: realtor, error } = await supabaseAdmin
      .from('realtors')
      .update({
        team_id: teamId,
        level,
        confidence,
        sales_resilience: salesResilience,
        success_mindset: successMindset
      })
      .eq('id', id)
      .select(`
        *,
        profile:profiles!realtors_user_id_fkey (
          full_name,
          email
        )
      `)
      .single();

    if (error) throw error;
    res.json(realtor);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

