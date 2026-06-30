-- Multi-branch support
-- Links a manager (identified by phone) to multiple business records.
-- When a manager logs in and has >1 branch, the client shows a branch-picker.

create table manager_businesses (
  manager_phone text not null,
  business_id   uuid not null references businesses(id) on delete cascade,
  person_id     uuid not null references people(id)    on delete cascade,
  is_owner      boolean not null default true,
  added_at      timestamptz not null default now(),
  primary key (manager_phone, business_id)
);

-- RLS (same permissive pattern as the rest of the schema for now)
alter table manager_businesses enable row level security;
create policy manager_businesses_allow_all on manager_businesses for all using (true) with check (true);

-- Back-fill existing managers: every existing person with role_type='manager'
-- gets a row in manager_businesses so the feature works immediately.
insert into manager_businesses (manager_phone, business_id, person_id, is_owner)
select p.phone, p.business_id, p.id, true
from people p
where p.role_type = 'manager'
on conflict do nothing;
