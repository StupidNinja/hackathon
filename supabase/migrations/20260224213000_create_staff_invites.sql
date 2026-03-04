begin;

create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null check (role in ('admin', 'jury')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  invited_by uuid not null references auth.users(id) on delete restrict,
  accepted_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists staff_invites_email_idx on public.staff_invites (lower(email));
create index if not exists staff_invites_status_idx on public.staff_invites (status);
create index if not exists staff_invites_expires_at_idx on public.staff_invites (expires_at);

create unique index if not exists staff_invites_pending_unique_idx
  on public.staff_invites (lower(email), role)
  where status = 'pending';

alter table public.staff_invites enable row level security;

drop policy if exists staff_invites_deny_all on public.staff_invites;
create policy staff_invites_deny_all
  on public.staff_invites
  for all
  to public
  using (false)
  with check (false);

commit;
