-- Add seikuli_rate column to subcategories table
ALTER TABLE subcategories
ADD COLUMN seikuli_rate numeric NOT NULL DEFAULT 700;

-- Remove seikuli_rate column from categories table
ALTER TABLE categories
DROP COLUMN seikuli_rate;