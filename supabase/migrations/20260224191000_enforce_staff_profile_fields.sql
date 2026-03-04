begin;

alter table public.profiles
  add column if not exists is_super_admin boolean not null default false;

update public.profiles
set
  school_id = null,
  custom_school_name = null,
  phone = null,
  telegram = null,
  grade = null
where role in ('admin', 'jury');

alter table public.profiles
  drop constraint if exists profiles_staff_fields_are_null;

alter table public.profiles
  add constraint profiles_staff_fields_are_null
  check (
    role not in ('admin', 'jury')
    or (
      school_id is null
      and custom_school_name is null
      and phone is null
      and telegram is null
      and grade is null
    )
  );

commit;
