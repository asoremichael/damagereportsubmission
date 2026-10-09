// These are the project's public connection details, not secret keys.
// Replace both placeholders with your Supabase Project URL and publishable key.
// NEVER put a Supabase secret/service_role key in a browser file.
// import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://tkfjhelelinqfnpomwmc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_nT-cNglWM3I8lXFeTkVXBQ_qeiKGi6-";

export const supabaseConfigured =
  !SUPABASE_URL.includes("PASTE_") &&
  !SUPABASE_PUBLISHABLE_KEY.includes("PASTE_");

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
