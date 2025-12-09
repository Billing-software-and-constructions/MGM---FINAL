-- Add invoice_number column to bills table
ALTER TABLE public.bills ADD COLUMN invoice_number TEXT;

-- Add last_invoice_number to settings table to track the sequence
ALTER TABLE public.settings ADD COLUMN last_invoice_number INTEGER DEFAULT 0;

-- Create index on invoice_number for faster lookups
CREATE INDEX idx_bills_invoice_number ON public.bills(invoice_number);