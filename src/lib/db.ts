import { createClient } from "@supabase/supabase-js";
import { isConfiguredEnvValue } from "@/lib/config";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseConfigured(): boolean {
  return isConfiguredEnvValue(supabaseUrl) && isConfiguredEnvValue(supabaseServiceRoleKey);
}

const resolvedSupabaseUrl = supabaseUrl || "https://placeholder.supabase.co";
const resolvedServiceRoleKey = supabaseServiceRoleKey || "placeholder";

export const supabase = createClient(resolvedSupabaseUrl, resolvedServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
