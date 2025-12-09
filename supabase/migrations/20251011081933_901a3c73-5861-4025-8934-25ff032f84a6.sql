-- Make seikuli_rate nullable in subcategories table
ALTER TABLE public.subcategories 
ALTER COLUMN seikuli_rate DROP NOT NULL,
ALTER COLUMN seikuli_rate DROP DEFAULT;