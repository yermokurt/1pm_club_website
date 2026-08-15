-- Confirmed Manila service windows: Morning 7:00 AM–10:00 AM; Lunch 12:00 PM–1:30 PM.
alter table public.business_settings alter column morning_cutoff set default '10:00';
alter table public.business_settings alter column lunch_cutoff set default '13:30';
update public.business_settings set morning_cutoff = '10:00', lunch_cutoff = '13:30' where id = true;
