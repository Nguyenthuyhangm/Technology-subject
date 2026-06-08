ALTER TABLE skin_advice_template
ADD COLUMN IF NOT EXISTS skin_overview TEXT;

ALTER TABLE skin_advice_template
ADD COLUMN IF NOT EXISTS recommended_product_ids TEXT;

ALTER TABLE skin_advice_template
ADD COLUMN IF NOT EXISTS avoid_notes TEXT;

ALTER TABLE skin_advice_template
ADD COLUMN IF NOT EXISTS hydration_score INTEGER;

ALTER TABLE skin_advice_template
ADD COLUMN IF NOT EXISTS barrier_score INTEGER;

ALTER TABLE skin_advice_template
ADD COLUMN IF NOT EXISTS sensitivity_score INTEGER;