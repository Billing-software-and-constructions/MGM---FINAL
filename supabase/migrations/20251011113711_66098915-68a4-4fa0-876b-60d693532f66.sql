-- Add subcategory tracking to old_exchanges table
ALTER TABLE public.old_exchanges
ADD COLUMN subcategory_id uuid REFERENCES public.subcategories(id),
ADD COLUMN subcategory_name text;

-- Add comment
COMMENT ON COLUMN public.old_exchanges.subcategory_id IS 'Reference to the subcategory of the exchanged ornament';
COMMENT ON COLUMN public.old_exchanges.subcategory_name IS 'Name of the subcategory for display purposes';