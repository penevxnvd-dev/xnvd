-- KPI Calculation Functions for Supabase

-- Function to calculate realtor KPI
CREATE OR REPLACE FUNCTION public.get_realtor_kpi(p_realtor_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deals_count INTEGER := 0;
  v_diagnoses_count INTEGER := 0;
  v_total_deal_value NUMERIC := 0;
  v_success_rate NUMERIC := 0;
  v_current_month_start DATE;
BEGIN
  -- Get start of current month
  v_current_month_start := DATE_TRUNC('month', CURRENT_DATE);

  -- Count deals and calculate total value for current month
  SELECT 
    COUNT(*),
    COALESCE(SUM(deal_value), 0)
  INTO v_deals_count, v_total_deal_value
  FROM public.deals
  WHERE realtor_id = p_realtor_id
    AND deal_date >= v_current_month_start;

  -- Count diagnoses for current month
  SELECT COUNT(*)
  INTO v_diagnoses_count
  FROM public.diagnoses
  WHERE realtor_id = p_realtor_id
    AND diagnosis_date >= v_current_month_start;

  -- Calculate success rate
  IF v_diagnoses_count > 0 THEN
    v_success_rate := ROUND((v_deals_count::NUMERIC / v_diagnoses_count::NUMERIC) * 100);
  END IF;

  RETURN json_build_object(
    'realtors', 1,
    'deals', v_deals_count,
    'diagnoses', v_diagnoses_count,
    'successRate', v_success_rate,
    'totalDealValue', v_total_deal_value,
    'levelDistribution', json_build_object()
  );
END;
$$;

-- Function to calculate team KPI
CREATE OR REPLACE FUNCTION public.get_team_kpi(p_team_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deals_count INTEGER := 0;
  v_diagnoses_count INTEGER := 0;
  v_total_deal_value NUMERIC := 0;
  v_success_rate NUMERIC := 0;
  v_realtors_count INTEGER := 0;
  v_level_distribution JSON := '{}'::JSON;
  v_current_month_start DATE;
  v_realtor_record RECORD;
  v_level INTEGER;
  v_level_count INTEGER;
BEGIN
  -- Get start of current month
  v_current_month_start := DATE_TRUNC('month', CURRENT_DATE);

  -- Count realtors in team
  SELECT COUNT(*) INTO v_realtors_count
  FROM public.realtors
  WHERE team_id = p_team_id;

  -- Calculate level distribution
  SELECT json_object_agg(level, count)
  INTO v_level_distribution
  FROM (
    SELECT level, COUNT(*) as count
    FROM public.realtors
    WHERE team_id = p_team_id
    GROUP BY level
  ) sub;

  -- Count deals and calculate total value for current month
  SELECT 
    COUNT(*),
    COALESCE(SUM(deal_value), 0)
  INTO v_deals_count, v_total_deal_value
  FROM public.deals d
  INNER JOIN public.realtors r ON d.realtor_id = r.id
  WHERE r.team_id = p_team_id
    AND d.deal_date >= v_current_month_start;

  -- Count diagnoses for current month
  SELECT COUNT(*)
  INTO v_diagnoses_count
  FROM public.diagnoses diag
  INNER JOIN public.realtors r ON diag.realtor_id = r.id
  WHERE r.team_id = p_team_id
    AND diag.diagnosis_date >= v_current_month_start;

  -- Calculate success rate
  IF v_diagnoses_count > 0 THEN
    v_success_rate := ROUND((v_deals_count::NUMERIC / v_diagnoses_count::NUMERIC) * 100);
  END IF;

  RETURN json_build_object(
    'realtors', v_realtors_count,
    'deals', v_deals_count,
    'diagnoses', v_diagnoses_count,
    'successRate', v_success_rate,
    'totalDealValue', v_total_deal_value,
    'levelDistribution', COALESCE(v_level_distribution, '{}'::JSON)
  );
END;
$$;

-- Function to calculate office KPI
CREATE OR REPLACE FUNCTION public.get_office_kpi(p_office_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deals_count INTEGER := 0;
  v_diagnoses_count INTEGER := 0;
  v_total_deal_value NUMERIC := 0;
  v_success_rate NUMERIC := 0;
  v_realtors_count INTEGER := 0;
  v_level_distribution JSON := '{}'::JSON;
  v_current_month_start DATE;
BEGIN
  -- Get start of current month
  v_current_month_start := DATE_TRUNC('month', CURRENT_DATE);

  -- Count realtors in office (through teams)
  SELECT COUNT(DISTINCT r.id) INTO v_realtors_count
  FROM public.realtors r
  INNER JOIN public.teams t ON r.team_id = t.id
  WHERE t.office_id = p_office_id;

  -- Calculate level distribution
  SELECT json_object_agg(level, count)
  INTO v_level_distribution
  FROM (
    SELECT r.level, COUNT(*) as count
    FROM public.realtors r
    INNER JOIN public.teams t ON r.team_id = t.id
    WHERE t.office_id = p_office_id
    GROUP BY r.level
  ) sub;

  -- Count deals and calculate total value for current month
  SELECT 
    COUNT(*),
    COALESCE(SUM(deal_value), 0)
  INTO v_deals_count, v_total_deal_value
  FROM public.deals d
  INNER JOIN public.realtors r ON d.realtor_id = r.id
  INNER JOIN public.teams t ON r.team_id = t.id
  WHERE t.office_id = p_office_id
    AND d.deal_date >= v_current_month_start;

  -- Count diagnoses for current month
  SELECT COUNT(*)
  INTO v_diagnoses_count
  FROM public.diagnoses diag
  INNER JOIN public.realtors r ON diag.realtor_id = r.id
  INNER JOIN public.teams t ON r.team_id = t.id
  WHERE t.office_id = p_office_id
    AND diag.diagnosis_date >= v_current_month_start;

  -- Calculate success rate
  IF v_diagnoses_count > 0 THEN
    v_success_rate := ROUND((v_deals_count::NUMERIC / v_diagnoses_count::NUMERIC) * 100);
  END IF;

  RETURN json_build_object(
    'realtors', v_realtors_count,
    'deals', v_deals_count,
    'diagnoses', v_diagnoses_count,
    'successRate', v_success_rate,
    'totalDealValue', v_total_deal_value,
    'levelDistribution', COALESCE(v_level_distribution, '{}'::JSON)
  );
END;
$$;

-- Function to calculate city KPI
CREATE OR REPLACE FUNCTION public.get_city_kpi(p_city_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deals_count INTEGER := 0;
  v_diagnoses_count INTEGER := 0;
  v_total_deal_value NUMERIC := 0;
  v_success_rate NUMERIC := 0;
  v_realtors_count INTEGER := 0;
  v_level_distribution JSON := '{}'::JSON;
  v_current_month_start DATE;
BEGIN
  -- Get start of current month
  v_current_month_start := DATE_TRUNC('month', CURRENT_DATE);

  -- Count realtors in city (through offices and teams)
  SELECT COUNT(DISTINCT r.id) INTO v_realtors_count
  FROM public.realtors r
  INNER JOIN public.teams t ON r.team_id = t.id
  INNER JOIN public.offices o ON t.office_id = o.id
  WHERE o.city_id = p_city_id;

  -- Calculate level distribution
  SELECT json_object_agg(level, count)
  INTO v_level_distribution
  FROM (
    SELECT r.level, COUNT(*) as count
    FROM public.realtors r
    INNER JOIN public.teams t ON r.team_id = t.id
    INNER JOIN public.offices o ON t.office_id = o.id
    WHERE o.city_id = p_city_id
    GROUP BY r.level
  ) sub;

  -- Count deals and calculate total value for current month
  SELECT 
    COUNT(*),
    COALESCE(SUM(deal_value), 0)
  INTO v_deals_count, v_total_deal_value
  FROM public.deals d
  INNER JOIN public.realtors r ON d.realtor_id = r.id
  INNER JOIN public.teams t ON r.team_id = t.id
  INNER JOIN public.offices o ON t.office_id = o.id
  WHERE o.city_id = p_city_id
    AND d.deal_date >= v_current_month_start;

  -- Count diagnoses for current month
  SELECT COUNT(*)
  INTO v_diagnoses_count
  FROM public.diagnoses diag
  INNER JOIN public.realtors r ON diag.realtor_id = r.id
  INNER JOIN public.teams t ON r.team_id = t.id
  INNER JOIN public.offices o ON t.office_id = o.id
  WHERE o.city_id = p_city_id
    AND diag.diagnosis_date >= v_current_month_start;

  -- Calculate success rate
  IF v_diagnoses_count > 0 THEN
    v_success_rate := ROUND((v_deals_count::NUMERIC / v_diagnoses_count::NUMERIC) * 100);
  END IF;

  RETURN json_build_object(
    'realtors', v_realtors_count,
    'deals', v_deals_count,
    'diagnoses', v_diagnoses_count,
    'successRate', v_success_rate,
    'totalDealValue', v_total_deal_value,
    'levelDistribution', COALESCE(v_level_distribution, '{}'::JSON)
  );
END;
$$;

-- Function to calculate country KPI
CREATE OR REPLACE FUNCTION public.get_country_kpi(p_country_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deals_count INTEGER := 0;
  v_diagnoses_count INTEGER := 0;
  v_total_deal_value NUMERIC := 0;
  v_success_rate NUMERIC := 0;
  v_realtors_count INTEGER := 0;
  v_level_distribution JSON := '{}'::JSON;
  v_current_month_start DATE;
BEGIN
  -- Get start of current month
  v_current_month_start := DATE_TRUNC('month', CURRENT_DATE);

  -- Count realtors in country (through cities, offices, and teams)
  SELECT COUNT(DISTINCT r.id) INTO v_realtors_count
  FROM public.realtors r
  INNER JOIN public.teams t ON r.team_id = t.id
  INNER JOIN public.offices o ON t.office_id = o.id
  INNER JOIN public.cities c ON o.city_id = c.id
  WHERE c.country_id = p_country_id;

  -- Calculate level distribution
  SELECT json_object_agg(level, count)
  INTO v_level_distribution
  FROM (
    SELECT r.level, COUNT(*) as count
    FROM public.realtors r
    INNER JOIN public.teams t ON r.team_id = t.id
    INNER JOIN public.offices o ON t.office_id = o.id
    INNER JOIN public.cities c ON o.city_id = c.id
    WHERE c.country_id = p_country_id
    GROUP BY r.level
  ) sub;

  -- Count deals and calculate total value for current month
  SELECT 
    COUNT(*),
    COALESCE(SUM(deal_value), 0)
  INTO v_deals_count, v_total_deal_value
  FROM public.deals d
  INNER JOIN public.realtors r ON d.realtor_id = r.id
  INNER JOIN public.teams t ON r.team_id = t.id
  INNER JOIN public.offices o ON t.office_id = o.id
  INNER JOIN public.cities c ON o.city_id = c.id
  WHERE c.country_id = p_country_id
    AND d.deal_date >= v_current_month_start;

  -- Count diagnoses for current month
  SELECT COUNT(*)
  INTO v_diagnoses_count
  FROM public.diagnoses diag
  INNER JOIN public.realtors r ON diag.realtor_id = r.id
  INNER JOIN public.teams t ON r.team_id = t.id
  INNER JOIN public.offices o ON t.office_id = o.id
  INNER JOIN public.cities c ON o.city_id = c.id
  WHERE c.country_id = p_country_id
    AND diag.diagnosis_date >= v_current_month_start;

  -- Calculate success rate
  IF v_diagnoses_count > 0 THEN
    v_success_rate := ROUND((v_deals_count::NUMERIC / v_diagnoses_count::NUMERIC) * 100);
  END IF;

  RETURN json_build_object(
    'realtors', v_realtors_count,
    'deals', v_deals_count,
    'diagnoses', v_diagnoses_count,
    'successRate', v_success_rate,
    'totalDealValue', v_total_deal_value,
    'levelDistribution', COALESCE(v_level_distribution, '{}'::JSON)
  );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_realtor_kpi(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_kpi(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_office_kpi(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_city_kpi(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_country_kpi(UUID) TO authenticated;

