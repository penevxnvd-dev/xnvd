-- Add RLS policies for team leaders to manage training progress for their team members

-- Allow team leaders to view training progress for realtors in their team
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'training_progress' 
    AND policyname = 'Team leaders can view training progress for their team'
  ) THEN
    CREATE POLICY "Team leaders can view training progress for their team"
      ON training_progress
      FOR SELECT
      USING (
        has_role(auth.uid(), 'team_leader'::app_role) AND
        realtor_id IN (
          SELECT r.id FROM realtors r
          JOIN teams t ON r.team_id = t.id
          WHERE t.leader_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Allow team leaders to insert training progress for realtors in their team
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'training_progress' 
    AND policyname = 'Team leaders can insert training progress for their team'
  ) THEN
    CREATE POLICY "Team leaders can insert training progress for their team"
      ON training_progress
      FOR INSERT
      WITH CHECK (
        has_role(auth.uid(), 'team_leader'::app_role) AND
        realtor_id IN (
          SELECT r.id FROM realtors r
          JOIN teams t ON r.team_id = t.id
          WHERE t.leader_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Allow team leaders to update training progress for realtors in their team
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'training_progress' 
    AND policyname = 'Team leaders can update training progress for their team'
  ) THEN
    CREATE POLICY "Team leaders can update training progress for their team"
      ON training_progress
      FOR UPDATE
      USING (
        has_role(auth.uid(), 'team_leader'::app_role) AND
        realtor_id IN (
          SELECT r.id FROM realtors r
          JOIN teams t ON r.team_id = t.id
          WHERE t.leader_id = auth.uid()
        )
      )
      WITH CHECK (
        has_role(auth.uid(), 'team_leader'::app_role) AND
        realtor_id IN (
          SELECT r.id FROM realtors r
          JOIN teams t ON r.team_id = t.id
          WHERE t.leader_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Also allow office managers and regional managers to manage training progress
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'training_progress' 
    AND policyname = 'Office managers can manage training progress'
  ) THEN
    CREATE POLICY "Office managers can manage training progress"
      ON training_progress
      FOR ALL
      USING (
        has_role(auth.uid(), 'office_manager'::app_role) OR
        has_role(auth.uid(), 'regional_manager'::app_role) OR
        has_role(auth.uid(), 'admin'::app_role)
      )
      WITH CHECK (
        has_role(auth.uid(), 'office_manager'::app_role) OR
        has_role(auth.uid(), 'regional_manager'::app_role) OR
        has_role(auth.uid(), 'admin'::app_role)
      );
  END IF;
END $$;
