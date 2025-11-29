-- SQL миграция за създаване на базата данни
-- Изпълнете този файл в PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for roles
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('admin', 'realtor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    profile_id UUID UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key from users to profiles
ALTER TABLE users 
    ADD CONSTRAINT users_profile_id_fkey 
    FOREIGN KEY (profile_id) 
    REFERENCES profiles(id) 
    ON DELETE CASCADE;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Create countries table
CREATE TABLE IF NOT EXISTS countries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create cities table
CREATE TABLE IF NOT EXISTS cities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(name, country_id)
);

-- Create offices table
CREATE TABLE IF NOT EXISTS offices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(name, city_id)
);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
    leader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(name, office_id)
);

-- Create realtors table
CREATE TABLE IF NOT EXISTS realtors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 5),
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    confidence BOOLEAN DEFAULT false,
    sales_resilience BOOLEAN DEFAULT false,
    success_mindset BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create deals table
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    realtor_id UUID NOT NULL REFERENCES realtors(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    deal_value NUMERIC(12,2) NOT NULL CHECK (deal_value >= 0),
    commission NUMERIC(12,2) CHECK (commission >= 0),
    deal_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create diagnoses table
CREATE TABLE IF NOT EXISTS diagnoses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    realtor_id UUID NOT NULL REFERENCES realtors(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    diagnosis_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create training_progress table
CREATE TABLE IF NOT EXISTS training_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    realtor_id UUID NOT NULL REFERENCES realtors(id) ON DELETE CASCADE,
    section TEXT NOT NULL,
    subsection TEXT NOT NULL,
    lecture_completed BOOLEAN DEFAULT false,
    video_completed BOOLEAN DEFAULT false,
    practical_completed BOOLEAN DEFAULT false,
    handover_completed BOOLEAN DEFAULT false,
    exam_completed BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(realtor_id, section, subsection)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_realtors_user_id ON realtors(user_id);
CREATE INDEX IF NOT EXISTS idx_realtors_team_id ON realtors(team_id);
CREATE INDEX IF NOT EXISTS idx_deals_realtor_id ON deals(realtor_id);
CREATE INDEX IF NOT EXISTS idx_deals_deal_date ON deals(deal_date);
CREATE INDEX IF NOT EXISTS idx_diagnoses_realtor_id ON diagnoses(realtor_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_diagnosis_date ON diagnoses(diagnosis_date);
CREATE INDEX IF NOT EXISTS idx_training_progress_realtor_id ON training_progress(realtor_id);


