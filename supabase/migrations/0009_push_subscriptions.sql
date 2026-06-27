-- Web Push subscriptions — one row per device/browser a person has opted in
-- on. A person can have several (phone + desktop), so this isn't unique per
-- person_id; unique per endpoint instead (re-subscribing the same device
-- updates rather than duplicates).
create table push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  person_id   uuid not null references people(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);
create index on push_subscriptions (business_id, person_id);

alter table push_subscriptions enable row level security;
