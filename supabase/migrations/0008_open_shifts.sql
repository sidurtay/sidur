-- A shift with no assigned person yet — any eligible employee can claim it.
-- Kept separate from schedule_assignments (whose person_id is not-null and
-- deeply relied on everywhere) rather than making that column nullable.
create table open_shifts (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  week_start  date not null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  role_key    text not null,
  time_in     time not null,
  time_out    time not null,
  created_at  timestamptz not null default now()
);
create index on open_shifts (business_id, week_start, day_of_week);

-- Same lockdown as every other table: RLS on, no policies — only the
-- service-role key (used exclusively by our Next.js API routes) can touch this.
alter table open_shifts enable row level security;
