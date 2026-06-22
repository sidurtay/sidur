-- ──────────────────────────────────────────────────────────────────────────
-- WebAuthn (passkey / fingerprint / Face ID) login.
-- credential storage per-person, plus a short-lived challenge table since
-- API routes are stateless serverless functions (no in-memory challenge cache).
-- ──────────────────────────────────────────────────────────────────────────

create table webauthn_credentials (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  person_id       uuid not null references people(id) on delete cascade,
  credential_id   text not null unique,       -- base64url, from the authenticator
  public_key      text not null,              -- base64url-encoded COSE public key
  counter         bigint not null default 0,
  device_label    text,                       -- e.g. "iPhone של דנה" — best-effort, user-editable
  created_at      timestamptz not null default now(),
  last_used_at    timestamptz
);

create index webauthn_credentials_person_idx on webauthn_credentials(person_id);

create table webauthn_challenges (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid references people(id) on delete cascade, -- set for registration; null for login (phone not yet resolved to a single flow)
  challenge   text not null,
  created_at  timestamptz not null default now()
);

-- Challenges are single-use and expire within ~2 minutes by application logic;
-- this index just makes the cleanup-by-age query cheap.
create index webauthn_challenges_created_idx on webauthn_challenges(created_at);

alter table webauthn_credentials enable row level security;
alter table webauthn_challenges enable row level security;
