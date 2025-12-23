-- Add discount_amount column to bills table
ALTER TABLE public.bills 
ADD COLUMN discount_amount numeric DEFAULT 0;