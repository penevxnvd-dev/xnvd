import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get cities by country
router.get('/country/:countryId', authenticate, async (req, res) => {
  try {
    const { countryId } = req.params;
    const { data: cities, error } = await supabaseAdmin
      .from('cities')
      .select('*')
      .eq('country_id', countryId)
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(cities || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create city
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, countryId } = req.body;
    const { data: city, error } = await supabaseAdmin
      .from('cities')
      .insert({ name, country_id: countryId })
      .select()
      .single();

    if (error) throw error;
    res.json(city);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update city
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const { data: city, error } = await supabaseAdmin
      .from('cities')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(city);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete city
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from('cities')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

