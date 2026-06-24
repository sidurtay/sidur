-- Optional email per person — used to deliver temp-password/reset notifications
-- via free Gmail SMTP instead of paid/approval-gated SMS or WhatsApp Business.
alter table people add column email text;
