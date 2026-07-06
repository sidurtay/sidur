// Ad-hoc / unplanned attendance bucket — someone who wasn't in the schedule
// at all today but showed up and clocked in anyway gets auto-added here
// instead of having no record at all. Shared between the clock-requests API
// (which creates these rows) and the schedule page (which renders them).
export const ADHOC_ROLE_KEY = 'בלת"ם';
export const ADHOC_ROLE_LABEL = 'בלת"ם — לא מתוכנן';
