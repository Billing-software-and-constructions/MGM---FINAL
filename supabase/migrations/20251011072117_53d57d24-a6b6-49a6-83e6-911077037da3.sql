-- Drop existing foreign key constraints
ALTER TABLE bill_items DROP CONSTRAINT IF EXISTS bill_items_category_id_fkey;
ALTER TABLE subcategories DROP CONSTRAINT IF EXISTS subcategories_category_id_fkey;

-- Add foreign key constraints with CASCADE delete
ALTER TABLE bill_items
ADD CONSTRAINT bill_items_category_id_fkey
FOREIGN KEY (category_id)
REFERENCES categories(id)
ON DELETE CASCADE;

ALTER TABLE subcategories
ADD CONSTRAINT subcategories_category_id_fkey
FOREIGN KEY (category_id)
REFERENCES categories(id)
ON DELETE CASCADE;