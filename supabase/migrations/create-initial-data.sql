-- ============================================================================
-- Create Initial Data Structure for XNVD
-- ============================================================================
-- This script creates:
-- - Country: България
-- - Cities: Варна, София, Пловдив, Бургас
-- - Offices with addresses
-- - Accounts with proper roles and relationships
-- ============================================================================
-- Execute this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/sql/new
-- ============================================================================

-- Step 1: Create Country
DO $$ 
DECLARE
  v_country_id UUID;
BEGIN
  -- Check if country exists
  SELECT id INTO v_country_id FROM public.countries WHERE name = 'България' LIMIT 1;
  
  IF v_country_id IS NULL THEN
    INSERT INTO public.countries (name, code)
    VALUES ('България', 'BG')
    RETURNING id INTO v_country_id;
    
    RAISE NOTICE '✅ Country created: България';
  ELSE
    RAISE NOTICE '✅ Country already exists: България';
  END IF;
  
  -- Step 2: Create Cities
  RAISE NOTICE '';
  RAISE NOTICE '📌 Creating cities...';
  
  -- Варна
  IF NOT EXISTS (SELECT 1 FROM public.cities WHERE name = 'Варна' AND country_id = v_country_id) THEN
    INSERT INTO public.cities (name, country_id)
    VALUES ('Варна', v_country_id);
    RAISE NOTICE '✅ City created: Варна';
  ELSE
    RAISE NOTICE '✅ City already exists: Варна';
  END IF;
  
  -- София
  IF NOT EXISTS (SELECT 1 FROM public.cities WHERE name = 'София' AND country_id = v_country_id) THEN
    INSERT INTO public.cities (name, country_id)
    VALUES ('София', v_country_id);
    RAISE NOTICE '✅ City created: София';
  ELSE
    RAISE NOTICE '✅ City already exists: София';
  END IF;
  
  -- Пловдив
  IF NOT EXISTS (SELECT 1 FROM public.cities WHERE name = 'Пловдив' AND country_id = v_country_id) THEN
    INSERT INTO public.cities (name, country_id)
    VALUES ('Пловдив', v_country_id);
    RAISE NOTICE '✅ City created: Пловдив';
  ELSE
    RAISE NOTICE '✅ City already exists: Пловдив';
  END IF;
  
  -- Бургас
  IF NOT EXISTS (SELECT 1 FROM public.cities WHERE name = 'Бургас' AND country_id = v_country_id) THEN
    INSERT INTO public.cities (name, country_id)
    VALUES ('Бургас', v_country_id);
    RAISE NOTICE '✅ City created: Бургас';
  ELSE
    RAISE NOTICE '✅ City already exists: Бургас';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ Initial data structure created!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next steps:';
  RAISE NOTICE '  1. Create accounts through Supabase Auth Dashboard';
  RAISE NOTICE '  2. Run create-accounts-and-offices.sql to complete setup';
  RAISE NOTICE '';
END $$;

