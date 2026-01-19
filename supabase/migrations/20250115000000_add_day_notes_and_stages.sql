-- Add day notes and stages to training_groups table
-- This allows storing custom descriptions and time-tracked stages for each day

ALTER TABLE public.training_groups
ADD COLUMN IF NOT EXISTS day_notes JSONB DEFAULT '{}'::jsonb;

-- day_notes structure:
-- {
--   "1": {
--     "description": "Описание на деня",
--     "howItWent": "Как е минал денят",
--     "stages": [
--       {
--         "id": "uuid",
--         "title": "Заглавие на етапа",
--         "startTime": "09:00",
--         "endTime": "10:30",
--         "duration": 90, // minutes
--         "description": "Описание на етапа"
--       }
--     ]
--   },
--   "2": { ... },
--   "3": { ... }
-- }

-- Create index for day_notes queries
CREATE INDEX IF NOT EXISTS idx_training_groups_day_notes ON public.training_groups USING GIN (day_notes);

-- Add comment for documentation
COMMENT ON COLUMN public.training_groups.day_notes IS 'JSONB object storing day-specific notes, descriptions, and time-tracked stages for each training day (1-3)';
