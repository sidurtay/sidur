-- Persists the structured "answer card" alongside the plain-text reply for
-- assistant messages, so reopening the chat later re-renders the same rich
-- card instead of falling back to a bulleted sentence (which is all the
-- history reload had to work with before this column existed).
alter table ai_conversations add column card jsonb;
