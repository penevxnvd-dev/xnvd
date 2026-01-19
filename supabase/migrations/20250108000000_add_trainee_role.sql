-- Add 'trainee' role to app_role enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'trainee' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
        ALTER TYPE app_role ADD VALUE 'trainee';
    END IF;
END $$;

-- Update comment
COMMENT ON TYPE app_role IS 'User roles: admin, realtor, team_leader, office_manager, regional_manager, trainee';

