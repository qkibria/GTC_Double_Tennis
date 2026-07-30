import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // This only warns in the browser console — it won't break the build.
  // If you see this, double-check the two environment variables are set
  // (see README.md).
  console.warn(
    "Supabase environment variables are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see README.md)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
