-- Schedule auto-close overtime shifts to run at 11:59 PM daily (server time)
SELECT
  cron.schedule(
    'auto-close-overtime-shifts',
    '59 23 * * *',
    $$
    SELECT
      net.http_post(
        url:='https://ahtiicqunajyyasuxebj.supabase.co/functions/v1/auto-close-overtime-shifts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFodGlpY3F1bmFqeXlhc3V4ZWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MzA5OTgsImV4cCI6MjA3MDAwNjk5OH0._s6TMn5NdiZCbE5Gy4bf6aFuSW-JJpRyoLg6FxV134A"}'::jsonb,
        body:='{"triggered_by": "cron"}'::jsonb
      ) as request_id;
    $$
  );