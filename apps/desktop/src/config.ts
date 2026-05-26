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

// <-- owner: paste the Supabase anon (publishable) key here.
export const SUPABASE_ANON_KEY = "";
