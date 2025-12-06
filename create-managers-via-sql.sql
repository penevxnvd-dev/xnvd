-- SQL script to create manager accounts
-- This creates the profiles and user_roles
-- Auth users will be created when they first login via Supabase Auth

-- Create Bulgaria if it doesn't exist
INSERT INTO countries (name, code)
VALUES ('България', 'BG')
ON CONFLICT (name) DO NOTHING;

-- Create cities
INSERT INTO cities (name, country_id)
SELECT 'Бургас', id FROM countries WHERE name = 'България'
ON CONFLICT (name, country_id) DO NOTHING;

INSERT INTO cities (name, country_id)
SELECT 'Пловдив', id FROM countries WHERE name = 'България'
ON CONFLICT (name, country_id) DO NOTHING;

-- Create office in Burgas
INSERT INTO offices (name, city_id)
SELECT 'Офис Бургас', id FROM cities WHERE name = 'Бургас'
ON CONFLICT (name, city_id) DO NOTHING;

-- Note: Profiles and user_roles will be created after auth users are created
-- Use the create-managers-accounts.js script with SERVICE_ROLE_KEY for auth user creation

