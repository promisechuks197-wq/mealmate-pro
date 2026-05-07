
# MealMate — Build Plan

A mobile-first responsive PWA (React + TanStack Start) backed by Lovable Cloud (Postgres + Auth). Designed to feel like a native app on phones, with a 5-tab bottom nav, and a hidden Admin panel for users with the `admin` role.

## 1. Design System

Update `src/styles.css` tokens:
- `--primary`: #0E521D (deep green)
- `--background`: #FFFFFF, `--card`: #F9F1F1, `--foreground`: #333333
- `--accent` (soft warm), `--destructive` (expiry red), `--muted`
- `--radius`: 20px (rounded, high-end feel)
- Typography pairing: a distinctive display font (e.g. Fraunces or Playfair) + clean sans (Manrope/DM Sans) — not Inter/Poppins
- Generous spacing, soft shadows, pill buttons, large tap targets

Mobile-first installable web app: add a simple `manifest.json` + icons (no service worker / vite-plugin-pwa per Lovable PWA guidance).

## 2. Backend (Lovable Cloud)

Enable Lovable Cloud, then create schema via migrations. Roles in a separate table to avoid privilege escalation.

Tables:
- `profiles` — `id` (= auth.users.id), `name`, `email`, `created_at`. Auto-created via trigger on signup.
- `user_roles` — `id`, `user_id`, `role` (enum `app_role`: `user` | `admin`). Unique (user_id, role).
- `inventory` — `id`, `user_id`, `item_name`, `qty` (numeric), `unit` (text), `category` (enum: `fridge`|`pantry`|`freezer`), `expiry_date` (date), `created_at`.
- `recipes` (global) — `id`, `title`, `image_url`, `prep_time_minutes`, `instructions` (text), `tags` (text[] — `quick`,`vegetarian`,`low_carb`,`gluten_free`), `created_by`, `created_at`.
- `recipe_ingredients` — `id`, `recipe_id`, `item_name` (normalized lowercase), `qty`, `unit`.
- `meal_plan` — `id`, `user_id`, `date`, `meal_slot` (enum `breakfast`|`lunch`|`dinner`), `recipe_id`. Unique (user_id, date, meal_slot).
- `grocery_list` — `id`, `user_id`, `item_name`, `qty`, `unit`, `checked` (bool), `source_recipe_id` nullable.

Security:
- RLS enabled on every table.
- `has_role(uid, role)` SECURITY DEFINER function.
- `inventory`, `meal_plan`, `grocery_list`, `profiles`: users access only their own rows; admins can read/modify all via `has_role(auth.uid(), 'admin')`.
- `recipes` & `recipe_ingredients`: readable by all authenticated users; writable only by admins.
- `user_roles`: readable by self + admins; writable only by admins (bootstrap by manually flipping your row in the DB after first signup).

Trigger: `handle_new_user()` inserts into `profiles` and assigns default `user` role.

Storage bucket: `recipe-images` (public read, admin write) for recipe photos.

## 3. App Structure (TanStack Start routes)

```
src/routes/
  __root.tsx                     // shell + providers
  index.tsx                      // marketing/landing OR redirect to /home if logged in
  login.tsx                      // email/password + Google
  signup.tsx
  _authenticated.tsx             // beforeLoad guard
  _authenticated/home.tsx        // Dashboard
  _authenticated/plan.tsx        // Weekly meal planner
  _authenticated/add.tsx         // Quick-add inventory item (center tab)
  _authenticated/recipes.tsx     // Recipe discovery
  _authenticated/recipes.$id.tsx // Recipe detail
  _authenticated/inventory.tsx   // Full inventory list
  _authenticated/grocery.tsx     // Smart grocery list
  _authenticated/profile.tsx     // Profile + hidden Admin entry
  _authenticated/_admin.tsx      // beforeLoad: requires admin role
  _authenticated/_admin/dashboard.tsx
  _authenticated/_admin/recipes.tsx       // CRUD recipes
  _authenticated/_admin/recipes.new.tsx
  _authenticated/_admin/recipes.$id.tsx   // edit
  _authenticated/_admin/users.tsx         // list + reset data
  _authenticated/_admin/users.$id.tsx     // view/override that user's inventory
```

Shared components:
- `BottomNav` (5 tabs: Home, Plan, Add, Recipes, Profile) — fixed bottom, mobile-first.
- `MobileShell` providing safe-area padding and bottom-nav layout for `_authenticated` routes.
- `ExpiryBadge`, `RecipeCard`, `MatchBar`, `EmptyState`, etc.

## 4. Feature Logic

**Home dashboard**
- Greeting derived from local time + profile name.
- "Cookable now" card: server fn computes recipes whose ingredients are fully covered by current inventory; returns count + top 3.
- Today's plan: pulls `meal_plan` for today, joined with recipes.

**Inventory**
- CRUD with form (name, qty + unit, category, expiry date).
- Visual cue: items with `expiry_date - today <= 2 days` rendered in destructive color; expired items get a stronger badge.
- Sort/filter by category and expiry.
- Decrement helper used after "I cooked this" action on recipe detail.

**Recipes & matching**
- Server fn `getRecipeMatches(filters)` returns recipes with `match_pct = matched_ingredients / total_ingredients`.
- Matching by case-insensitive `item_name` equality (v1) — note in code that fuzzy matching is a future improvement.
- Filter chips: Quick (≤20m), Vegetarian, Low Carb, Gluten-Free (tag-based).
- Recipe detail: ingredient checklist showing in-stock vs missing, "Cook now" (decrements inventory), "Add to plan" (opens slot picker), "Add missing to grocery list".

**Meal planner**
- Week grid (Mon–Sun × B/L/D), tap a slot to assign a recipe.
- Auto-Plan button: server fn picks recipes that maximize use of items closest to expiry, greedy fill across 7 days × 3 slots.
- Assigning a recipe auto-syncs missing ingredients into `grocery_list`.

**Grocery list**
- Group by category (heuristic from item name), checkboxes, "Clear checked", manual add.

**Profile**
- Avatar, name, email, sign out.
- Hidden Admin entry: only rendered when `has_role(user, 'admin')` returns true (checked via server fn cached in query).

## 5. Admin Panel

- Layout route `_admin` enforces role via `beforeLoad` calling a server fn `requireAdmin()` that uses `requireSupabaseAuth` middleware + `has_role` check; non-admins redirected to `/home`.
- **Recipe management:** table + create/edit form (title, image upload to bucket, prep time, tags multi-select, dynamic ingredient rows, instructions). Delete with confirm.
- **User management:** list profiles + role; actions: promote/demote (write to `user_roles`), "Reset data" (server fn deletes that user's inventory/meal_plan/grocery_list with `supabaseAdmin`, with double confirm).
- **Inventory override:** open any user → see/edit their inventory (admin RLS bypass via service role server fns; all actions audit-logged to console for v1).

## 6. Auth Flow

- Email/password + Google (Lovable Cloud defaults).
- `onAuthStateChange` listener set up before `getSession()` in a top-level provider.
- `_authenticated` layout guard with redirect-back; `login` redirects authenticated users away.
- `signUp` with `emailRedirectTo: window.location.origin`.
- First admin: user signs up normally, then manually inserts `('admin')` row into `user_roles` via the Cloud DB UI (will be called out in the README/onboarding note).

## 7. Tech Notes (technical section)

- State: TanStack Query for server state (lighter than Redux Toolkit for this scope and idiomatic in TanStack Start). Local UI state via React.
- Server fns: `createServerFn` + `requireSupabaseAuth` for all user-scoped reads/writes; `supabaseAdmin` only inside admin-gated server fns.
- Types: generate from Cloud schema; share enums (`category`, `meal_slot`, `app_role`) across UI.
- Validation: zod schemas on every form + server fn input.
- PWA: `manifest.json` + apple-touch-icon only; no service worker.
- SEO/meta: per-route `head()` for public pages (landing, login, signup).
- Accessibility: all icons have labels; bottom nav uses semantic `nav` + aria-current.

## 8. Build Order

1. Enable Lovable Cloud + base auth (email/password + Google) + `_authenticated` guard.
2. Migrations: enums, profiles, user_roles, `has_role`, signup trigger, RLS.
3. Mobile shell + bottom nav + design tokens + landing/login/signup screens.
4. Inventory CRUD (the data core).
5. Recipes table + read-only recipe browse + recipe detail.
6. Matching algorithm + filters + Home "cookable now" card.
7. Meal planner grid + Auto-Plan + grocery sync.
8. Grocery list screen.
9. Admin layout + recipe CRUD + image upload.
10. Admin user management + inventory override.
11. PWA manifest + polish + empty states.

## 9. Out of Scope for v1

- Push notifications for expiring items.
- Barcode scanning / OCR receipt import.
- Fuzzy ingredient matching, unit conversion.
- Social/sharing features.
- Native iOS/Android packaging.
