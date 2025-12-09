-- Add silver_rate column to settings table
ALTER TABLE public.settings 
ADD COLUMN silver_rate numeric NOT NULL DEFAULT 7000;