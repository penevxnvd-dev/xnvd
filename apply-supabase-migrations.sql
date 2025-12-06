-- ============================================================================
-- Complete Supabase Migration Script
-- ============================================================================
-- This script applies all necessary migrations for the XNVD project
-- Execute this in Supabase SQL Editor: 
-- https://supabase.com/dashboard/org/rbpqagivdpacdvwlwgep/sql/new
--
-- IMPORTANT: Run this script in order (if you haven't already applied some migrations)
-- ============================================================================

-- ============================================================================
-- Migration 1: Add new roles (team_leader, office_manager)
-- ============================================================================
-- File: supabase/migrations/20251206000000_add_new_roles.sql

-- Add new roles to the app_role enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'team_leader' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
        ALTER TYPE app_role ADD VALUE 'team_leader';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'office_manager' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
        ALTER TYPE app_role ADD VALUE 'office_manager';
    END IF;
END $$;

-- RLS Policies for teams (team_leader can view their team, office_manager can view teams in their office)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'teams' 
        AND policyname = 'Team leaders can view their teams'
    ) THEN
        CREATE POLICY "Team leaders can view their teams" ON public.teams FOR SELECT TO authenticated USING (
            public.has_role(auth.uid(), 'team_leader') AND leader_id = auth.uid()
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'teams' 
        AND policyname = 'Office managers can view teams in their office'
    ) THEN
        CREATE POLICY "Office managers can view teams in their office" ON public.teams FOR SELECT TO authenticated USING (
            public.has_role(auth.uid(), 'office_manager') AND office_id IN (
                SELECT id FROM public.offices WHERE manager_id = auth.uid()
            )
        );
    END IF;
END $$;

-- RLS Policies for realtors (team_leader can view realtors in their team, office_manager can view realtors in their office)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'realtors' 
        AND policyname = 'Team leaders can view realtors in their team'
    ) THEN
        CREATE POLICY "Team leaders can view realtors in their team" ON public.realtors FOR SELECT TO authenticated USING (
            public.has_role(auth.uid(), 'team_leader') AND team_id IN (
                SELECT id FROM public.teams WHERE leader_id = auth.uid()
            )
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'realtors' 
        AND policyname = 'Office managers can view realtors in their office'
    ) THEN
        CREATE POLICY "Office managers can view realtors in their office" ON public.realtors FOR SELECT TO authenticated USING (
            public.has_role(auth.uid(), 'office_manager') AND team_id IN (
                SELECT id FROM public.teams WHERE office_id IN (
                    SELECT id FROM public.offices WHERE manager_id = auth.uid()
                )
            )
        );
    END IF;
END $$;

-- RLS Policies for training_progress (team_leader/office_manager can update for their realtors)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'training_progress' 
        AND policyname = 'Team leaders can update training progress for their team'
    ) THEN
        CREATE POLICY "Team leaders can update training progress for their team" ON public.training_progress FOR UPDATE TO authenticated USING (
            public.has_role(auth.uid(), 'team_leader') AND realtor_id IN (
                SELECT id FROM public.realtors WHERE team_id IN (
                    SELECT id FROM public.teams WHERE leader_id = auth.uid()
                )
            )
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'training_progress' 
        AND policyname = 'Office managers can update training progress for their office'
    ) THEN
        CREATE POLICY "Office managers can update training progress for their office" ON public.training_progress FOR UPDATE TO authenticated USING (
            public.has_role(auth.uid(), 'office_manager') AND realtor_id IN (
                SELECT id FROM public.realtors WHERE team_id IN (
                    SELECT id FROM public.teams WHERE office_id IN (
                        SELECT id FROM public.offices WHERE manager_id = auth.uid()
                    )
                )
            )
        );
    END IF;
END $$;

-- ============================================================================
-- Migration 2: Add regional_manager role and city manager relationship
-- ============================================================================
-- File: supabase/migrations/20251206000001_add_regional_manager.sql

-- Update AppRole enum to include regional_manager
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'regional_manager' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
        ALTER TYPE app_role ADD VALUE 'regional_manager';
    END IF;
END $$;

-- Add manager_id to cities table for regional manager relationship
ALTER TABLE public.cities 
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add manager_id to offices table for office manager relationship
ALTER TABLE public.offices 
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_cities_manager_id ON public.cities(manager_id);
CREATE INDEX IF NOT EXISTS idx_offices_manager_id ON public.offices(manager_id);

-- Update RLS policies to allow regional managers to see their cities
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'cities' 
        AND policyname = 'Regional managers can view their cities'
    ) THEN
        CREATE POLICY "Regional managers can view their cities"
        ON public.cities FOR SELECT
        TO authenticated
        USING (
            manager_id = auth.uid() OR
            public.has_role(auth.uid(), 'admin')
        );
    END IF;
END $$;

-- Allow regional managers to view offices in their cities
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'offices' 
        AND policyname = 'Regional managers can view offices in their cities'
    ) THEN
        CREATE POLICY "Regional managers can view offices in their cities"
        ON public.offices FOR SELECT
        TO authenticated
        USING (
            city_id IN (
                SELECT id FROM public.cities WHERE manager_id = auth.uid()
            ) OR
            manager_id = auth.uid() OR
            public.has_role(auth.uid(), 'admin')
        );
    END IF;
END $$;

-- Allow regional managers to view teams in their cities
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'teams' 
        AND policyname = 'Regional managers can view teams in their cities'
    ) THEN
        CREATE POLICY "Regional managers can view teams in their cities"
        ON public.teams FOR SELECT
        TO authenticated
        USING (
            office_id IN (
                SELECT o.id FROM public.offices o
                JOIN public.cities c ON o.city_id = c.id
                WHERE c.manager_id = auth.uid()
            ) OR
            public.has_role(auth.uid(), 'admin') OR
            public.has_role(auth.uid(), 'office_manager')
        );
    END IF;
END $$;

-- Allow regional managers to view realtors in their cities
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'realtors' 
        AND policyname = 'Regional managers can view realtors in their cities'
    ) THEN
        CREATE POLICY "Regional managers can view realtors in their cities"
        ON public.realtors FOR SELECT
        TO authenticated
        USING (
            team_id IN (
                SELECT t.id FROM public.teams t
                JOIN public.offices o ON t.office_id = o.id
                JOIN public.cities c ON o.city_id = c.id
                WHERE c.manager_id = auth.uid()
            ) OR
            public.has_role(auth.uid(), 'admin') OR
            public.has_role(auth.uid(), 'office_manager') OR
            public.has_role(auth.uid(), 'team_leader')
        );
    END IF;
END $$;

-- Allow regional managers to view training progress in their cities
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'training_progress' 
        AND policyname = 'Regional managers can view training progress in their cities'
    ) THEN
        CREATE POLICY "Regional managers can view training progress in their cities"
        ON public.training_progress FOR SELECT
        TO authenticated
        USING (
            realtor_id IN (
                SELECT r.id FROM public.realtors r
                JOIN public.teams t ON r.team_id = t.id
                JOIN public.offices o ON t.office_id = o.id
                JOIN public.cities c ON o.city_id = c.id
                WHERE c.manager_id = auth.uid()
            ) OR
            public.has_role(auth.uid(), 'admin')
        );
    END IF;
END $$;

-- Allow regional managers to update training progress in their cities
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'training_progress' 
        AND policyname = 'Regional managers can update training progress in their cities'
    ) THEN
        CREATE POLICY "Regional managers can update training progress in their cities"
        ON public.training_progress FOR UPDATE
        TO authenticated
        USING (
            realtor_id IN (
                SELECT r.id FROM public.realtors r
                JOIN public.teams t ON r.team_id = t.id
                JOIN public.offices o ON t.office_id = o.id
                JOIN public.cities c ON o.city_id = c.id
                WHERE c.manager_id = auth.uid()
            ) OR
            public.has_role(auth.uid(), 'admin')
        );
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN public.cities.manager_id IS 'ID of the regional manager (profile)';
COMMENT ON COLUMN public.offices.manager_id IS 'ID of the office manager (profile)';
COMMENT ON TYPE app_role IS 'User roles: admin, realtor, team_leader, office_manager, regional_manager';

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '✅ Всички миграции са приложени успешно!';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Приложени миграции:';
    RAISE NOTICE '   1. Добавени роли: team_leader, office_manager';
    RAISE NOTICE '   2. Добавена роля: regional_manager';
    RAISE NOTICE '   3. Добавени колони: cities.manager_id, offices.manager_id';
    RAISE NOTICE '   4. Създадени RLS policies за новите роли';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Готово за използване!';
END $$;

