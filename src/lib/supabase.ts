import { createClient } from "@supabase/supabase-js";

// Public (anon) credentials — safe to ship to the browser; access is
// enforced by row level security in the database.
export const SUPABASE_URL = "https://gebydcdxxuysrhlxehwf.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlYnlkY2R4eHV5c3JobHhlaHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNDkwNzYsImV4cCI6MjEwNzcyNTA3Nn0.HPSRhB0j6Rh-tJn9Woc-Y_pb9slkK6XmF5YB2Jl6VWI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: typeof window !== "undefined", autoRefreshToken: true },
});
