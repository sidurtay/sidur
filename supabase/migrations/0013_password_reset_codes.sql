-- Email-verified in-app password change: a 6-digit code sent to the
-- account's own email, valid for 5 minutes, single-use. Separate from the
-- existing forgot-password temp-password flow (that one is for "I'm locked
-- out"; this one is "I'm logged in and want to change my password safely").
create table if not exists password_reset_codes (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid not null references people(id) on delete cascade,
  code_hash   text not null,
  expires_at  timestamptz not null,
  used        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists password_reset_codes_person_idx on password_reset_codes (person_id, created_at desc);
