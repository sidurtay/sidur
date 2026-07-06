-- Live foreground-only GPS positions, one row per person, upserted while
-- they're clocked in and the app is open. Not a history table — this is
-- "where is this person right now," overwritten every update. Rows are
-- meaningless once someone clocks out; readers should also cross-check
-- schedule_assignments.actual_in_time/actual_out_time for the day.
create table if not exists employee_locations (
  person_id uuid primary key references people(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now()
);
create index if not exists employee_locations_business_idx on employee_locations(business_id);
