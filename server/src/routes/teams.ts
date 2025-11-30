import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get teams by office
router.get('/office/:officeId', authenticate, async (req, res) => {
  try {
    const { officeId } = req.params;
    const { data: teams, error } = await supabaseAdmin
      .from('teams')
      .select('*')
      .eq('office_id', officeId)
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(teams || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create team
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, officeId, leaderId } = req.body;
    const { data: team, error } = await supabaseAdmin
      .from('teams')
      .insert({ name, office_id: officeId, leader_id: leaderId })
      .select()
      .single();

    if (error) throw error;
    res.json(team);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update team
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, leaderId } = req.body;
    const { data: team, error } = await supabaseAdmin
      .from('teams')
      .update({ name, leader_id: leaderId })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(team);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete team
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from('teams')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

