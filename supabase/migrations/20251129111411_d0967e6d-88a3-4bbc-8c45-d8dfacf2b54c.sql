-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'realtor');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create countries table
CREATE TABLE public.countries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create cities table
CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, country_id)
);

-- Create offices table
CREATE TABLE public.offices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, city_id)
);

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, office_id)
);

-- Create realtors table (extends profiles with realtor-specific data)
CREATE TABLE public.realtors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 5),
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Personal qualities (green/red indicators)
  confidence BOOLEAN DEFAULT false,
  sales_resilience BOOLEAN DEFAULT false,
  success_mindset BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create deals table
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  realtor_id UUID NOT NULL REFERENCES public.realtors(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  deal_value NUMERIC(12,2) NOT NULL CHECK (deal_value >= 0),
  commission NUMERIC(12,2) CHECK (commission >= 0),
  deal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create diagnoses table (диагнози = leads/inquiries)
CREATE TABLE public.diagnoses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  realtor_id UUID NOT NULL REFERENCES public.realtors(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  diagnosis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create training_progress table
CREATE TABLE public.training_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  realtor_id UUID NOT NULL REFERENCES public.realtors(id) ON DELETE CASCADE,
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

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to get current user's realtor_id
CREATE OR REPLACE FUNCTION public.get_realtor_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.realtors WHERE user_id = _user_id LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for countries (admins manage, all can view)
CREATE POLICY "Everyone can view countries" ON public.countries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage countries" ON public.countries FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for cities
CREATE POLICY "Everyone can view cities" ON public.cities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage cities" ON public.cities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for offices
CREATE POLICY "Everyone can view offices" ON public.offices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage offices" ON public.offices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for teams
CREATE POLICY "Everyone can view teams" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage teams" ON public.teams FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for realtors
CREATE POLICY "Admins can view all realtors" ON public.realtors FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Realtors can view own data" ON public.realtors FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage realtors" ON public.realtors FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for deals
CREATE POLICY "Admins can view all deals" ON public.deals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Realtors can view own deals" ON public.deals FOR SELECT TO authenticated 
  USING (realtor_id = public.get_realtor_id(auth.uid()));
CREATE POLICY "Admins can manage deals" ON public.deals FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Realtors can insert own deals" ON public.deals FOR INSERT TO authenticated 
  WITH CHECK (realtor_id = public.get_realtor_id(auth.uid()));

-- RLS Policies for diagnoses
CREATE POLICY "Admins can view all diagnoses" ON public.diagnoses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Realtors can view own diagnoses" ON public.diagnoses FOR SELECT TO authenticated 
  USING (realtor_id = public.get_realtor_id(auth.uid()));
CREATE POLICY "Admins can manage diagnoses" ON public.diagnoses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Realtors can insert own diagnoses" ON public.diagnoses FOR INSERT TO authenticated 
  WITH CHECK (realtor_id = public.get_realtor_id(auth.uid()));

-- RLS Policies for training_progress
CREATE POLICY "Admins can view all training progress" ON public.training_progress FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Realtors can view own training progress" ON public.training_progress FOR SELECT TO authenticated 
  USING (realtor_id = public.get_realtor_id(auth.uid()));
CREATE POLICY "Admins can manage training progress" ON public.training_progress FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Realtors can update own training progress" ON public.training_progress FOR UPDATE TO authenticated 
  USING (realtor_id = public.get_realtor_id(auth.uid()));

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_realtors_updated_at BEFORE UPDATE ON public.realtors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_progress_updated_at BEFORE UPDATE ON public.training_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();