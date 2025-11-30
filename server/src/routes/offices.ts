import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get offices by city
router.get('/city/:cityId', authenticate, async (req, res) => {
  try {
    const { cityId } = req.params;
    const { data: offices, error } = await supabaseAdmin
      .from('offices')
      .select('*')
      .eq('city_id', cityId)
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(offices || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get office with full structure (teams, leaders, realtors, deals)
router.get('/:id/full', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get office with city and country
    const { data: office, error: officeError } = await supabaseAdmin
      .from('offices')
      .select(`
        *,
        city:cities (
          *,
          country:countries (*)
        )
      `)
      .eq('id', id)
      .single();

    if (officeError || !office) {
      return res.status(404).json({ error: 'Office not found' });
    }

    // Get teams with leaders and realtors
    const { data: teams, error: teamsError } = await supabaseAdmin
      .from('teams')
      .select(`
        *,
        leader:profiles!teams_leader_id_fkey (
          *,
          realtor:realtors (*)
        ),
        realtors:realtors (
          *,
          profile:profiles!realtors_user_id_fkey (*),
          deals:deals (*),
          diagnoses:diagnoses (*)
        )
      `)
      .eq('office_id', id);

    if (teamsError) throw teamsError;

    res.json({
      ...office,
      teams: teams || []
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all offices with full structure
router.get('/all/full', authenticate, async (req, res) => {
  try {
    const { data: offices, error: officesError } = await supabaseAdmin
      .from('offices')
      .select(`
        *,
        city:cities (
          *,
          country:countries (*)
        )
      `)
      .order('name', { ascending: true });

    if (officesError) throw officesError;

    // Get teams for all offices
    const { data: allTeams, error: teamsError } = await supabaseAdmin
      .from('teams')
      .select(`
        *,
        leader:profiles!teams_leader_id_fkey (
          *,
          realtor:realtors (*)
        ),
        realtors:realtors (
          *,
          profile:profiles!realtors_user_id_fkey (*),
          deals:deals (*),
          diagnoses:diagnoses (*)
        )
      `);

    if (teamsError) throw teamsError;

    // Group teams by office_id
    const teamsByOffice = (allTeams || []).reduce((acc: any, team: any) => {
      if (!acc[team.office_id]) {
        acc[team.office_id] = [];
      }
      acc[team.office_id].push(team);
      return acc;
    }, {});

    // Attach teams to offices
    const officesWithTeams = (offices || []).map((office: any) => ({
      ...office,
      teams: teamsByOffice[office.id] || []
    }));

    res.json(officesWithTeams);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create office
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, cityId, address } = req.body;
    const { data: office, error } = await supabaseAdmin
      .from('offices')
      .insert({ name, city_id: cityId, address })
      .select()
      .single();

    if (error) throw error;
    res.json(office);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update office
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, address } = req.body;
    const { data: office, error } = await supabaseAdmin
      .from('offices')
      .update({ name, address })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(office);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete office
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from('offices')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

