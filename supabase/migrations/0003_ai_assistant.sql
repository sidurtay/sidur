-- ──────────────────────────────────────────────────────────────────────────
-- AI Assistant: conversation history, absence requests, and a general-
-- purpose manager notification inbox the assistant can write into.
-- ──────────────────────────────────────────────────────────────────────────

create table ai_conversations (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  person_id   uuid not null references people(id) on delete cascade,
  role        text not null,               -- user | assistant
  content     text not null,
  created_at  timestamptz not null default now()
);

create index ai_conversations_person_idx on ai_conversations(business_id, person_id, created_at);

create table absence_requests (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  person_id   uuid not null references people(id) on delete cascade,
  date        date not null,
  reason      text,
  status      text not null default 'pending', -- pending | approved | denied
  created_at  timestamptz not null default now()
);

create table manager_notifications (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  person_id   uuid references people(id) on delete set null, -- who triggered it, if relevant
  type        text not null,               -- swap_request | absence_request | other
  title       text not null,
  body        text not null,
  ref_id      uuid,                        -- id of the related row (swap_requests.id / absence_requests.id)
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Same lockdown as every other table: RLS on, no policies — only the
-- service-role key (used exclusively by our Next.js API routes) can touch these.
alter table ai_conversations enable row level security;
alter table absence_requests enable row level security;
alter table manager_notifications enable row level security;
