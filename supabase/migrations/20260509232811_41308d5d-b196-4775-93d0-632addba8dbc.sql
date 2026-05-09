-- Add fields needed for Nigerian food app
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS meal_type text,
  ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'Easy',
  ADD COLUMN IF NOT EXISTS spice_level text NOT NULL DEFAULT 'Mild',
  ADD COLUMN IF NOT EXISTS base_servings integer NOT NULL DEFAULT 4;

CREATE INDEX IF NOT EXISTS idx_recipes_meal_type ON public.recipes(meal_type);

-- Favourites table
CREATE TABLE IF NOT EXISTS public.favourites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipe_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);

ALTER TABLE public.favourites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own favourites"
  ON public.favourites FOR ALL
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));