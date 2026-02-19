import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/common/api/config/supabase.config";

export const supabase = createClient(
  supabaseConfig.url,
  supabaseConfig.anonKey,
);
