-- Performance optimization indexes for Phase 3
-- These indexes will significantly improve query performance for common operations

-- Index for realtors by team_id (most common query)
CREATE INDEX IF NOT EXISTS idx_realtors_team_id ON realtors(team_id);
CREATE INDEX IF NOT EXISTS idx_realtors_user_id ON realtors(user_id);
CREATE INDEX IF NOT EXISTS idx_realtors_level ON realtors(level);

-- Index for teams by office_id
CREATE INDEX IF NOT EXISTS idx_teams_office_id ON teams(office_id);
CREATE INDEX IF NOT EXISTS idx_teams_leader_id ON teams(leader_id);

-- Index for offices by city_id
CREATE INDEX IF NOT EXISTS idx_offices_city_id ON offices(city_id);
CREATE INDEX IF NOT EXISTS idx_offices_manager_id ON offices(manager_id);

-- Index for cities by country_id
CREATE INDEX IF NOT EXISTS idx_cities_country_id ON cities(country_id);
CREATE INDEX IF NOT EXISTS idx_cities_manager_id ON cities(manager_id);

-- Index for training_progress (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_training_progress_realtor_id ON training_progress(realtor_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_section_subsection ON training_progress(realtor_id, section, subsection);

-- Index for deals by realtor_id
CREATE INDEX IF NOT EXISTS idx_deals_realtor_id ON deals(realtor_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);

-- Index for diagnoses by realtor_id
CREATE INDEX IF NOT EXISTS idx_diagnoses_realtor_id ON diagnoses(realtor_id);

-- Index for user_roles by user_id (most common query)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Index for profiles by email (for lookups)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Composite index for common join patterns
CREATE INDEX IF NOT EXISTS idx_realtors_team_level ON realtors(team_id, level);

-- Index for training groups
CREATE INDEX IF NOT EXISTS idx_training_groups_created_at ON training_groups(created_at);
