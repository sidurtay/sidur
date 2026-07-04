-- Optional weekly deadline for submitting availability constraints, set by
-- the manager in Settings and shown to employees on the constraints page.
-- Null means no deadline is configured — nothing changes for that business.
alter table businesses add column if not exists constraints_deadline_day smallint check (constraints_deadline_day between 0 and 6);
alter table businesses add column if not exists constraints_deadline_time time;
