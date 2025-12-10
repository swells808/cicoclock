import { createClient } from '@supabase/supabase-js';
import type { Database } from './types.js';

const SUPABASE_URL = "https://ahtiicqunajyyasuxebj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFodGlpY3F1bmFqeXlhc3V4ZWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MzA5OTgsImV4cCI6MjA3MDAwNjk5OH0._s6TMn5NdiZCbE5Gy4bf6aFuSW-JJpRyoLg6FxV134A";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
