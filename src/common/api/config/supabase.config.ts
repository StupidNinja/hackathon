type SupabaseConfig = {
  url: string;
  anonKey: string;
};

const requireEnv = (name: keyof ImportMetaEnv): string => {
  const value = import.meta.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
};

export const supabaseConfig: SupabaseConfig = {
  url: requireEnv("VITE_SUPABASE_URL"),
  anonKey: requireEnv("VITE_SUPABASE_ANON_KEY"),
};
