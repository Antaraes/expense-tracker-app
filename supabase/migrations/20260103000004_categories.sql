CREATE TABLE public.categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  icon        TEXT,
  color       TEXT,
  type        TEXT NOT NULL CHECK (type IN ('expense', 'income', 'both')),
  is_system   BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_user ON public.categories(user_id);

INSERT INTO public.categories (user_id, parent_id, name, icon, color, type, is_system, sort_order)
VALUES
  (NULL, NULL, 'Food & Drink', 'utensils', '#FF6B6B', 'expense', true, 10),
  (NULL, NULL, 'Transport', 'car', '#74B9FF', 'expense', true, 20),
  (NULL, NULL, 'Shopping', 'shopping-bag', '#FDCB6E', 'expense', true, 30),
  (NULL, NULL, 'Salary', 'briefcase', '#00D68F', 'income', true, 40),
  (NULL, NULL, 'Freelance', 'laptop', '#6C5CE7', 'income', true, 50);
