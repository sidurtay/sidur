-- Sidur — initial schema
-- Run this once in the Supabase SQL Editor (or via `supabase db push` once the CLI is linked).
--
-- Security note (read before going to production):
-- RLS is enabled on every table but the policies below are permissive (anon role can read/write
-- freely). That's intentional for this phase — we don't have Supabase Auth wired up yet, so we
-- have no `auth.uid()` to scope policies against. All access control currently happens in the
-- Next.js API routes. Tighten these policies (and move auth onto Supabase Auth or a signed JWT)
-- before this handles real customer data.

create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────────────────────────────────
-- Businesses
-- ──────────────────────────────────────────────────────────────────────────
create table businesses (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  city            text,
  business_type   text,                       -- cafe | restaurant | bar | other
  business_id_num text,                        -- ח.פ / עוסק מורשה
  plan            text not null default 'basic', -- basic | growth | business
  tips_mode       text not null default 'per-shift', -- daily | per-shift
  clockout_requires_approval boolean not null default true,
  created_at      timestamptz not null default now()
);

create table business_hours (
  business_id  uuid not null references businesses(id) on delete cascade,
  day_of_week  smallint not null check (day_of_week between 0 and 6), -- 0=Sunday
  is_open      boolean not null default true,
  open_time    time,
  close_time   time,
  primary key (business_id, day_of_week)
);

-- ──────────────────────────────────────────────────────────────────────────
-- Roles (role keys are free text per business, e.g. "מלצר", "מארחת")
-- ──────────────────────────────────────────────────────────────────────────
create table roles (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  key         text not null,
  label       text not null,
  is_custom   boolean not null default false,
  recurring   boolean,                         -- null = not yet decided, set by the "keep this role?" prompt
  created_at  timestamptz not null default now(),
  unique (business_id, key)
);

create table role_permissions (
  business_id      uuid not null references businesses(id) on delete cascade,
  role_key         text not null,
  permission_key   text not null,               -- editSchedule | approveSwaps | publishTips | addEmployee | manageAnnouncements
  enabled          boolean not null default false,
  primary key (business_id, role_key, permission_key)
);

-- ──────────────────────────────────────────────────────────────────────────
-- People — managers and employees share one table (both log in with phone+password)
-- ──────────────────────────────────────────────────────────────────────────
create table people (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references businesses(id) on delete cascade,
  name                text not null,
  phone               text not null,
  password_hash       text,                      -- null until first login / set
  temp_password       text,                       -- plaintext temp password shown once via WhatsApp; cleared after first login
  must_change_password boolean not null default false,
  role_type           text not null default 'employee', -- manager | employee
  role_key            text,                       -- job role, e.g. "מלצר" — null for managers
  initials            text,
  color               text,
  text_color          text,
  since_label         text,                       -- e.g. "מרץ 2026" (display only)
  created_at          timestamptz not null default now(),
  unique (business_id, phone)
);

-- ──────────────────────────────────────────────────────────────────────────
-- Schedule
-- ──────────────────────────────────────────────────────────────────────────
create table schedule_assignments (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  week_start    date not null,                   -- Sunday of the week this row belongs to
  day_of_week   smallint not null check (day_of_week between 0 and 6),
  person_id     uuid not null references people(id) on delete cascade,
  role_key      text not null,                    -- which section/table this shows under
  home_role_key text,                              -- person's normal role, if different (emergency coverage)
  time_in       time not null,
  time_out      time not null,
  actual_in_time    time,
  actual_in_source  text,                          -- qr | fingerprint | manual | app
  actual_out_time   time,
  actual_out_source text,
  created_at    timestamptz not null default now()
);
create index on schedule_assignments (business_id, week_start, day_of_week);

create table swap_requests (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  assignment_id   uuid not null references schedule_assignments(id) on delete cascade,
  requested_by    uuid not null references people(id),
  proposed_person uuid references people(id),
  status          text not null default 'pending', -- pending | approved | denied
  created_at      timestamptz not null default now()
);

create table ai_schedule_configs (
  business_id  uuid primary key references businesses(id) on delete cascade,
  config       jsonb not null,
  updated_at   timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────────────────
-- Availability constraints
-- ──────────────────────────────────────────────────────────────────────────
create table constraints (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  person_id   uuid not null references people(id) on delete cascade,
  week_start  date not null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  status      text not null default 'all',         -- all | morning | evening | off
  unique (business_id, person_id, week_start, day_of_week)
);

create table constraint_notes (
  business_id uuid not null references businesses(id) on delete cascade,
  person_id   uuid not null references people(id) on delete cascade,
  week_start  date not null,
  note        text not null default '',
  primary key (business_id, person_id, week_start)
);

-- ──────────────────────────────────────────────────────────────────────────
-- Clock in/out requests
-- ──────────────────────────────────────────────────────────────────────────
create table clock_requests (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  person_id    uuid not null references people(id) on delete cascade,
  type         text not null,                       -- in | out
  status       text not null default 'pending',      -- pending | approved | denied
  requested_at timestamptz not null default now(),
  resolved_at  timestamptz
);

-- ──────────────────────────────────────────────────────────────────────────
-- Tips
-- ──────────────────────────────────────────────────────────────────────────
create table tips_days (
  business_id    uuid not null references businesses(id) on delete cascade,
  date           date not null,
  morning_total  numeric,
  evening_total  numeric,
  daily_total    numeric,
  published      boolean not null default false,
  locked         boolean not null default false,
  locked_by      text,
  locked_at      timestamptz,
  primary key (business_id, date)
);

create table tips_notifications (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  person_id   uuid references people(id) on delete cascade, -- null = visible to all (manager view)
  title       text not null,
  body        text not null,
  created_at  timestamptz not null default now(),
  read        boolean not null default false
);

-- ──────────────────────────────────────────────────────────────────────────
-- Announcements
-- ──────────────────────────────────────────────────────────────────────────
create table announcements (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  title       text not null,
  body        text not null,
  created_by  uuid references people(id),
  created_at  timestamptz not null default now()
);

create table announcement_confirmations (
  announcement_id uuid not null references announcements(id) on delete cascade,
  person_id       uuid not null references people(id) on delete cascade,
  confirmed_at    timestamptz not null default now(),
  primary key (announcement_id, person_id)
);

-- ──────────────────────────────────────────────────────────────────────────
-- Chat
-- ──────────────────────────────────────────────────────────────────────────
create table chat_channels (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name        text not null,
  emoji       text,
  color       text,
  icon_color  text,
  pinned      boolean not null default false,
  created_at  timestamptz not null default now()
);

create table chat_channel_members (
  channel_id uuid not null references chat_channels(id) on delete cascade,
  person_id  uuid not null references people(id) on delete cascade,
  primary key (channel_id, person_id)
);

create table chat_messages (
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid not null references chat_channels(id) on delete cascade,
  sender_id   uuid references people(id),
  body        text not null,
  created_at  timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────────────────
-- Support / waitlist (not business-scoped — these come from the marketing pages)
-- ──────────────────────────────────────────────────────────────────────────
create table support_tickets (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid references businesses(id) on delete set null,
  subject       text not null,
  message       text not null,
  sender_name   text,
  sender_phone  text,
  status        text not null default 'open',     -- open | resolved
  created_at    timestamptz not null default now()
);

create table device_waitlist (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  phone         text not null,
  business_name text,
  created_at    timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────────────────
-- RLS — enabled everywhere, permissive policies for now (see note at top of file)
-- ──────────────────────────────────────────────────────────────────────────
do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all using (true) with check (true)', t || '_allow_all', t);
  end loop;
end $$;
