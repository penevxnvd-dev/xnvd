import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get all countries
router.get('/', authenticate, async (req, res) => {
  try {
    const { data: countries, error } = await supabaseAdmin
      .from('countries')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(countries || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create country
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, code } = req.body;
    const { data: country, error } = await supabaseAdmin
      .from('countries')
      .insert({ name, code })
      .select()
      .single();

    if (error) throw error;
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
    const { data: country, error } = await supabaseAdmin
      .from('countries')
      .update({ name, code })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(country);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete country
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from('countries')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

