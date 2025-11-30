import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate, requireRealtor, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get diagnoses for current realtor
router.get('/me', authenticate, requireRealtor, async (req: AuthRequest, res) => {
  try {
    const { data: realtor, error: realtorError } = await supabaseAdmin
      .from('realtors')
      .select('id')
      .eq('user_id', req.userId!)
      .single();

    if (realtorError || !realtor) {
      return res.status(404).json({ error: 'Realtor not found' });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: diagnoses, error } = await supabaseAdmin
      .from('diagnoses')
      .select('*')
      .eq('realtor_id', realtor.id)
      .gte('diagnosis_date', startOfMonth.toISOString().split('T')[0])
      .order('diagnosis_date', { ascending: false });

    if (error) throw error;
    res.json(diagnoses || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create diagnosis
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

    const { clientName, status, notes, diagnosisDate } = req.body;
    const { data: diagnosis, error } = await supabaseAdmin
      .from('diagnoses')
      .insert({
        realtor_id: realtor.id,
        client_name: clientName,
        status: status || 'active',
        notes,
        diagnosis_date: diagnosisDate ? diagnosisDate : new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (error) throw error;
    res.json(diagnosis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

