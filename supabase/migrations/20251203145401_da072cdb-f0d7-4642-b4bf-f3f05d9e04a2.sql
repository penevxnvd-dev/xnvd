-- Create realtor_goals table for personal goals
CREATE TABLE IF NOT EXISTS public.realtor_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  realtor_id UUID NOT NULL REFERENCES public.realtors(id) ON DELETE CASCADE,
  month SMALLINT NOT NULL CHECK (month >= 1 AND month <= 12),
  year SMALLINT NOT NULL CHECK (year >= 2020),
  deals_goal INTEGER NOT NULL DEFAULT 0,
  keys_goal INTEGER NOT NULL DEFAULT 0,
  exclusives_goal INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (realtor_id, month, year)
);

-- Create buyer_schedule table for weekly buyer appointments
CREATE TABLE IF NOT EXISTS public.buyer_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  realtor_id UUID NOT NULL REFERENCES public.realtors(id) ON DELETE CASCADE,
  schedule_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  buyer1_name TEXT,
  buyer1_phone TEXT,
  buyer1_notes TEXT,
  buyer2_name TEXT,
  buyer2_phone TEXT,
  buyer2_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table for chat functionality
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.realtor_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for realtor_goals
CREATE POLICY "Admins can manage all goals"
ON public.realtor_goals FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Realtors can view own goals"
ON public.realtor_goals FOR SELECT
USING (realtor_id = get_realtor_id(auth.uid()));

CREATE POLICY "Realtors can create own goals"
ON public.realtor_goals FOR INSERT
WITH CHECK (realtor_id = get_realtor_id(auth.uid()));

CREATE POLICY "Realtors can update own goals"
ON public.realtor_goals FOR UPDATE
USING (realtor_id = get_realtor_id(auth.uid()));

-- RLS Policies for buyer_schedule
CREATE POLICY "Admins can manage all schedules"
ON public.buyer_schedule FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Realtors can view own schedule"
ON public.buyer_schedule FOR SELECT
USING (realtor_id = get_realtor_id(auth.uid()));

CREATE POLICY "Realtors can create own schedule"
ON public.buyer_schedule FOR INSERT
WITH CHECK (realtor_id = get_realtor_id(auth.uid()));

CREATE POLICY "Realtors can update own schedule"
ON public.buyer_schedule FOR UPDATE
USING (realtor_id = get_realtor_id(auth.uid()));

CREATE POLICY "Realtors can delete own schedule"
ON public.buyer_schedule FOR DELETE
USING (realtor_id = get_realtor_id(auth.uid()));

-- RLS Policies for messages
CREATE POLICY "Users can view own messages"
ON public.messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receivers can mark as read"
ON public.messages FOR UPDATE
USING (auth.uid() = receiver_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_realtor_goals_realtor ON public.realtor_goals(realtor_id);
CREATE INDEX IF NOT EXISTS idx_buyer_schedule_realtor ON public.buyer_schedule(realtor_id);
CREATE INDEX IF NOT EXISTS idx_buyer_schedule_date ON public.buyer_schedule(schedule_date);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at);

-- Create trigger for updated_at on realtor_goals
CREATE TRIGGER update_realtor_goals_updated_at
BEFORE UPDATE ON public.realtor_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on buyer_schedule
CREATE TRIGGER update_buyer_schedule_updated_at
BEFORE UPDATE ON public.buyer_schedule
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();