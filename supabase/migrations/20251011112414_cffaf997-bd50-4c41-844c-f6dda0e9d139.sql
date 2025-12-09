-- Create old_exchanges table
CREATE TABLE public.old_exchanges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  category_id UUID NOT NULL,
  category_name TEXT NOT NULL,
  initial_weight NUMERIC NOT NULL,
  final_weight NUMERIC NOT NULL,
  metal_rate NUMERIC NOT NULL,
  exchange_value NUMERIC NOT NULL,
  exchange_type TEXT NOT NULL CHECK (exchange_type IN ('cash', 'ornaments')),
  bill_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_category FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT fk_bill FOREIGN KEY (bill_id) REFERENCES public.bills(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.old_exchanges ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Allow all operations on old_exchanges"
ON public.old_exchanges
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_old_exchanges_updated_at
BEFORE UPDATE ON public.old_exchanges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();