# Hackathon Registration Module – Supabase Data Model & Onboarding Flow

> This document describes the **database structure in Supabase** and the **onboarding algorithm** for a hackathon participant (team captain).  
> It is intended as a specification for a GPT-Codex style model that will generate frontend/backend code.

---

## 1. Supabase Data Model

### 1.1. System Table: `auth.users`

This table is managed by Supabase Auth.

- **id**: `uuid` – primary key; user identifier.
- **email**: `text` – unique email.
- **created_at**: `timestamptz`.
- **last_sign_in_at**: `timestamptz`.
- **other auth-related columns** (password hash, provider info, etc.).

The application **does not modify** this table directly.  
All writes go through Supabase Auth methods (email, magic link, Google OAuth, etc.).

---

### 1.2. Table: `public.profiles`

User profile data for the hackathon (only captains and staff use the app UI).

**Purpose:**

- Store personal info of the authenticated user.
- Store school and grade info.
- Store application role (team/admin/jury).

**Columns:**

- `id`: `uuid` – **PK**, references `auth.users(id)` (1:1 with user).
- `first_name`: `text` – first name (required at application level).
- `last_name`: `text` – last name (required at application level).
- `phone`: `text` – phone number.
- `telegram`: `text` – telegram handle.
- `grade`: `int` – school grade, with DB constraint  
  `check (grade in (10, 11))`.
- `school_id`: `uuid` – FK to `public.schools(id)`, nullable.
- `custom_school_name`: `text` – name of the school if it’s not in dictionary; used when `school_id` is `NULL`.
- `role`: `text` – application role, default `'team'`,  
  `check (role in ('team', 'admin', 'jury'))`.
- `created_at`: `timestamptz` – default `now()`.
- `updated_at`: `timestamptz` – default `now()`.

**Trigger:**

- Trigger `set_profiles_updated_at` calls function `public.set_updated_at()`  
  *before update* to always set `updated_at = now()`.

**RLS intents (high-level):**

- For `role = 'team'`:
  - SELECT/INSERT/UPDATE only where `id = auth.uid()`.
- For `role = 'admin'`:
  - full access to all profiles.

---

### 1.3. Table: `public.schools`

Dictionary of schools used in registration.  
Each school is referenced by an i18n code used on the client side.

**Columns:**

- `id`: `uuid` – **PK**, default `gen_random_uuid()`.
- `code`: `text` – i18n code, **unique**, used as translation key in the client,  
  e.g. `schoolNIS1`, `school1`, etc.
- `name_ru`: `text` – display name in Russian (current base language).
- `name_kz`: `text` – display name in Kazakh (optional, for future localization).
- `name_en`: `text` – display name in English (optional).
- `is_active`: `boolean` – default `true`; allows to hide schools from UI without deleting them.
- `created_at`: `timestamptz` – default `now()`.

**Indexes:**

- `schools_name_ru_idx` on `lower(name_ru)` – for autocomplete search by name.

**RLS intents:**

- Read access:
  - For all authenticated users (or even `anon`) – `SELECT` allowed.
- Write access:
  - Only for admins – `INSERT/UPDATE/DELETE`.

---

### 1.4. Table: `public.teams`

Represents a hackathon team registered by a captain.

**Columns:**

- `id`: `uuid` – **PK**, default `gen_random_uuid()`.
- `name`: `text` – unique team name, not null.
- `captain_id`: `uuid` – FK to `auth.users(id)`, not null.  
  Defines which user is the captain and owner of the team.
- `members_count`: `smallint` – total number of team members (including captain), optional.
- `status`: `text` – team registration status, default `'registered'`,  
  `check (status in ('registered', 'cancelled', 'disqualified'))`.
- `created_at`: `timestamptz` – default `now()`.
- `updated_at`: `timestamptz` – default `now()`.

**Triggers:**

- `set_teams_updated_at` uses `public.set_updated_at()` before update.

**Additional index/constraint (optional but recommended):**

- Unique index on `captain_id` to enforce “one team per captain”:

  - `unique (captain_id)`

**RLS intents:**

- For `role = 'team'`:
  - SELECT/UPDATE only where `captain_id = auth.uid()`.
  - INSERT allowed only with `captain_id = auth.uid()`.
- For `role = 'admin'`:
  - full access.

---

### 1.5. Table: `public.team_members`

List of team members, including the captain.

**Columns:**

- `id`: `uuid` – **PK**, default `gen_random_uuid()`.
- `team_id`: `uuid` – FK to `public.teams(id)`, not null.
- `user_id`: `uuid` – optional FK to `auth.users(id)`.
  - For the captain: `user_id = captain_id`.
  - For other members: usually `NULL` (they don’t interact with the system).
- `first_name`: `text` – required at application level.
- `last_name`: `text` – required at application level.
- `email`: `text` – optional; for non-captains can be empty.
- `phone`: `text` – optional.
- `telegram`: `text` – optional.
- `is_captain`: `boolean` – default `false`.  
  Exactly one record per team should have `is_captain = true`.

**Constraints:**

- Unique index to ensure **one captain per team**:

  - unique `(team_id)` where `is_captain = true`.

**RLS intents:**

- For `role = 'team'`:
  - Captain can select/insert/update/delete members only where `team_id` belongs to a team with `captain_id = auth.uid()`.
- For `role = 'admin'`:
  - full access.

---

## 2. Onboarding Algorithm (Team Captain)

This section describes the high-level onboarding flow for a captain, using the data model above.  
The goal: after authentication, guide user through:

1. Filling personal profile (`profiles`).
2. Creating and filling team data (`teams` + `team_members`).

The algorithm is written in a way suitable for code generation by a GPT-Codex style model.

---

### 2.1. States

Define conceptual states for the authenticated user:

- `UNAUTHENTICATED` – no Supabase session.
- `NO_PROFILE` – authenticated, but no `profiles` row.
- `NO_TEAM` – profile exists, but no team where `captain_id = user.id`.
- `READY` – profile and team exist; onboarding is complete.

Frontend should route user based on this state.

---

### 2.2. Entry Point After Auth

1. After successful Supabase Auth (Google OAuth or email), obtain current user:
   - `user_id = auth.users.id`.

2. Load profile:
   - `SELECT * FROM profiles WHERE id = user_id`.

3. Load team:
   - `SELECT * FROM teams WHERE captain_id = user_id`.

4. Determine onboarding state:

   - If no session → `UNAUTHENTICATED` → redirect to login.
   - If profile does not exist → `NO_PROFILE` → redirect to profile step.
   - If profile exists but no team → `NO_TEAM` → redirect to team step.
   - If both profile and team exist → `READY` → redirect to main app (e.g. checkpoints dashboard).

---

### 2.3. Step 1 – Profile Completion (`profiles`)

**Page:** `/app/profile` (first onboarding step for new user).

**Form fields (from user’s perspective):**

- First name
- Last name
- Phone
- Telegram
- School:
  - Autocomplete from `schools` (by `name_ru`, but underlying reference is `id`).
  - Option “Other school”.
- Other school name (only if “Other school” selected).
- Grade (select: `10` or `11`).

**Data mapping:**

- `profiles.id = user_id`
- `profiles.first_name`
- `profiles.last_name`
- `profiles.phone`
- `profiles.telegram`
- `profiles.grade`
- `profiles.school_id` – if selected from dictionary.
- `profiles.custom_school_name` – if “Other school”.
- `profiles.role` – default `'team'` (for captains).

**Algorithm:**

1. On page load:
   - If `profiles` row exists:
     - Pre-fill form with existing values.
   - If not:
     - Empty form.

2. On user submit:
   - Validate required fields on client:
     - first_name, last_name, grade.
     - At least one of: `school_id` or `custom_school_name`.
   - Perform upsert to `profiles`:
     - INSERT if no row with `id = user_id`.
     - UPDATE otherwise.

3. If upsert is successful:
   - If team already exists for this user:
     - Onboarding state → `READY`, redirect to main app (or to team editor, depending on UX).
   - If team does not exist:
     - Onboarding state → `NO_TEAM`, redirect to team step (Step 2).

**Important notes for implementation:**

- Do not allow users to proceed to team creation without a valid profile.
- Handle server validation errors (grade not in 10/11, etc.) gracefully.

---

### 2.4. Step 2 – Team Creation & Members (`teams` + `team_members`)

**Page:** `/app/team` (second onboarding step).

**Form structure:**

- Block “Team info”:
  - Team name (required, unique).
- Block “Team members”:
  - Member 1 – captain (pre-filled from profile and auth):
    - first_name, last_name from `profiles`.
    - email from `auth.users.email`.
    - phone, telegram from `profiles`.
  - Member 2–4 – additional participants:
    - first_name, last_name (required at app level).
    - email (optional or required by business rules).
    - phone, telegram (optional).

**Constraints:**

- Team size: 2–4 members total (including captain), enforced on client and/or server.
- Exactly one `team_members` row per team with `is_captain = true`.

**Algorithm:**

1. On page load:
   - Fetch existing team:
     - `SELECT * FROM teams WHERE captain_id = user_id`.
   - If team exists:
     - Fetch members:
       - `SELECT * FROM team_members WHERE team_id = team.id ORDER BY is_captain DESC`.
     - Pre-fill form:
       - team name
       - members list (captain + others).
   - If team does not exist:
     - Create a default in-memory team model:
       - empty team name.
       - one member (captain) with fields pre-filled from profile and auth.

2. On submit (create/update team):

   **Step 2.1 – Upsert team record**

   - If no team in DB:
     - INSERT into `teams`:
       - `name`
       - `captain_id = user_id`
       - optionally `members_count` (to be updated after members are processed).
   - If team exists:
     - UPDATE `teams`:
       - `name`
       - optionally `status` and `members_count`.

   **Step 2.2 – Sync team members**

   - After having `team_id` (from insert or existing):
     - Upsert captain member:
       - Ensure there is one row with:
         - `team_id = team.id`
         - `user_id = user_id`
         - `first_name`, `last_name`, `email`, `phone`, `telegram`
         - `is_captain = true`
     - For other members:
       - Strategy A (simpler):
         - Delete all existing `team_members` where `team_id = team.id AND is_captain = false`.
         - Insert new rows for members from the form (2–4 total including captain).
       - Strategy B (more advanced):
         - Diff existing vs form and upsert per row.

     - After processing all members:
       - Update `teams.members_count` = number of `team_members` rows for this team.

3. If all operations succeed:
   - Mark onboarding state as `READY`.
   - Redirect user to main participant dashboard (e.g. `/app/dashboard` or `/app/checkpoints`).

---

### 2.5. Re-Entry Logic (Subsequent Logins)

On every login:

1. Determine state as in 2.2:
   - If profile missing → redirect to `/app/profile`.
   - If profile exists but no team → redirect to `/app/team`.
   - If both profile and team exist → redirect to main app.

2. Provide navigation in main app:
   - Menu item “Profile” → `/app/profile` (allows editing profile).
   - Menu item “Team” → `/app/team` (allows editing team name and members).
   - Edits should **not break** constraints (grade, team size, unique team name, etc.).

---

### 2.6. Admin & Jury (out of scope for registration, but relevant)

- `role = 'admin'` in `profiles`:
  - Admin can view and manage all teams and members; onboarding flow is different.
- `role = 'jury'`:
  - Jury users do not need team creation; they may have separate onboarding or manual provisioning.

The registration module should treat any user with `role != 'team'` as **not going through the team onboarding** and route them to admin/jury views.

---