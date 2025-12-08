-- Create training_groups table
CREATE TABLE IF NOT EXISTS public.training_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  start_date DATE NOT NULL,
  leader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_day INTEGER NOT NULL DEFAULT 1 CHECK (current_day >= 1 AND current_day <= 3),
  status TEXT NOT NULL DEFAULT 'активна' CHECK (status IN ('активна', 'завършена', 'предстояща')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create training_group_trainees table
CREATE TABLE IF NOT EXISTS public.training_group_trainees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.training_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  position TEXT,
  intro_completed BOOLEAN NOT NULL DEFAULT false,
  training_stage INTEGER NOT NULL DEFAULT 1 CHECK (training_stage >= 1 AND training_stage <= 5),
  level TEXT DEFAULT 'Чирак',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_training_groups_leader_id ON public.training_groups(leader_id);
CREATE INDEX IF NOT EXISTS idx_training_groups_start_date ON public.training_groups(start_date);
CREATE INDEX IF NOT EXISTS idx_training_groups_status ON public.training_groups(status);
CREATE INDEX IF NOT EXISTS idx_training_group_trainees_group_id ON public.training_group_trainees(group_id);

-- Enable RLS
ALTER TABLE public.training_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_group_trainees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for training_groups
-- Allow authenticated users to read all training groups
CREATE POLICY "Allow authenticated users to read training groups"
  ON public.training_groups
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert training groups
CREATE POLICY "Allow authenticated users to insert training groups"
  ON public.training_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update training groups
CREATE POLICY "Allow authenticated users to update training groups"
  ON public.training_groups
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete training groups
CREATE POLICY "Allow authenticated users to delete training groups"
  ON public.training_groups
  FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for training_group_trainees
-- Allow authenticated users to read all trainees
CREATE POLICY "Allow authenticated users to read training group trainees"
  ON public.training_group_trainees
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert trainees
CREATE POLICY "Allow authenticated users to insert training group trainees"
  ON public.training_group_trainees
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update trainees
CREATE POLICY "Allow authenticated users to update training group trainees"
  ON public.training_group_trainees
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete trainees
CREATE POLICY "Allow authenticated users to delete training group trainees"
  ON public.training_group_trainees
  FOR DELETE
  TO authenticated
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_training_groups_updated_at
  BEFORE UPDATE ON public.training_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_group_trainees_updated_at
  BEFORE UPDATE ON public.training_group_trainees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

