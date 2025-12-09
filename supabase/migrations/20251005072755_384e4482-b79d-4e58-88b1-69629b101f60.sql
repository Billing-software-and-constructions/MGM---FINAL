-- Create settings table for global gold rate
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gold_rate DECIMAL(10,2) NOT NULL DEFAULT 10000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create categories table with seikuli rate per category
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  seikuli_rate DECIMAL(10,2) NOT NULL DEFAULT 700,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subcategories table
CREATE TABLE public.subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, name)
);

-- Enable Row Level Security
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no authentication required)
CREATE POLICY "Allow public read access to settings"
  ON public.settings FOR SELECT
  USING (true);

CREATE POLICY "Allow public write access to settings"
  ON public.settings FOR ALL
  USING (true);

CREATE POLICY "Allow public read access to categories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Allow public write access to categories"
  ON public.categories FOR ALL
  USING (true);

CREATE POLICY "Allow public read access to subcategories"
  ON public.subcategories FOR SELECT
  USING (true);

CREATE POLICY "Allow public write access to subcategories"
  ON public.subcategories FOR ALL
  USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subcategories_updated_at
  BEFORE UPDATE ON public.subcategories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings record
INSERT INTO public.settings (gold_rate) VALUES (10000);

-- Insert sample categories with different seikuli rates
INSERT INTO public.categories (name, seikuli_rate) VALUES 
  ('Chains', 700),
  ('Rings', 800);

-- Insert sample subcategories
INSERT INTO public.subcategories (category_id, name) 
SELECT id, 'Gold Chain' FROM public.categories WHERE name = 'Chains'
UNION ALL
SELECT id, 'Silver Chain' FROM public.categories WHERE name = 'Chains'
UNION ALL
SELECT id, 'Diamond Ring' FROM public.categories WHERE name = 'Rings'
UNION ALL
SELECT id, 'Gold Ring' FROM public.categories WHERE name = 'Rings';

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subcategories;