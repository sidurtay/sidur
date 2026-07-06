-- Business location + geofence radius, used for the live in-shift GPS/map
-- feature: lets a manager see clocked-in staff on a map and get an alert if
-- someone leaves the workplace radius during their shift. Nullable/off by
-- default — a business only starts using this once they explicitly set a
-- location in Settings.
alter table businesses add column if not exists geofence_enabled boolean default false;
alter table businesses add column if not exists geofence_lat double precision;
alter table businesses add column if not exists geofence_lng double precision;
alter table businesses add column if not exists geofence_radius_m integer default 150;
