// Baked app configuration shipped in the build.
//
// IMPORTANT: only the Supabase ANON / publishable key goes here. It is
// designed to be public and to ship in client apps (Row Level Security
// protects the data). NEVER put the service_role key or the database password
// here — those would be extractable from the distributed binary.
//
// The owner provides the anon key once; it becomes the default backend so
// accounts work out-of-the-box for everyone who installs the app. Users can
// still override the backend in-app (Login → Backend setup).

export const SUPABASE_URL = "https://juedejmrwuqdzywcpboc.supabase.co";

// Supabase anon (public) key — safe to ship in clients; RLS protects data.
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1ZWRlam1yd3VxZHp5d2NwYm9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzY1NDgsImV4cCI6MjA5MTg1MjU0OH0.y8mtQedTZXkokmzhxa5M5Qw77XsAxIpGZ0cuiuNxHaQ";
