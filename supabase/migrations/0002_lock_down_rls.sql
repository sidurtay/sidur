-- ──────────────────────────────────────────────────────────────────────────
-- Lock down RLS: the app never queries Supabase directly from the browser —
-- every read/write goes through Next.js API routes using the service-role
-- key, which always bypasses RLS. The anon/publishable key is therefore not
-- needed for any data access, and the only safe policy is "deny everyone
-- except service_role". Dropping the permissive allow-all policies (with RLS
-- already enabled on every table) makes that the default: zero policies +
-- RLS enabled = deny all access for any role that doesn't bypass RLS.
-- ──────────────────────────────────────────────────────────────────────────
do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('drop policy if exists %I on %I', t || '_allow_all', t);
  end loop;
end $$;
