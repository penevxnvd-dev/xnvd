-- Migration: Add goals and buyer schedule tables for realtors

-- Add new fields to deals table for keys and exclusives
ALTER TABLE deals 
    ADD COLUMN IF NOT EXISTS is_key BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN DEFAULT false;

-- Create realtor_goals table for monthly goals
CREATE TABLE IF NOT EXISTS realtor_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    realtor_id UUID NOT NULL REFERENCES realtors(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    deals_goal INTEGER DEFAULT 0 CHECK (deals_goal >= 0),
    keys_goal INTEGER DEFAULT 0 CHECK (keys_goal >= 0),
    exclusives_goal INTEGER DEFAULT 0 CHECK (exclusives_goal >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(realtor_id, month, year)
);

-- Create buyer_schedule table for weekly schedule with buyers
CREATE TABLE IF NOT EXISTS buyer_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    realtor_id UUID NOT NULL REFERENCES realtors(id) ON DELETE CASCADE,
    schedule_date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    buyer1_name TEXT,
    buyer1_phone TEXT,
    buyer1_notes TEXT,
    buyer2_name TEXT,
    buyer2_phone TEXT,
    buyer2_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_realtor_goals_realtor_id ON realtor_goals(realtor_id);
CREATE INDEX IF NOT EXISTS idx_realtor_goals_month_year ON realtor_goals(month, year);
CREATE INDEX IF NOT EXISTS idx_buyer_schedule_realtor_id ON buyer_schedule(realtor_id);
CREATE INDEX IF NOT EXISTS idx_buyer_schedule_date ON buyer_schedule(schedule_date);

