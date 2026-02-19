/// <reference types="vite/client" />

type EnvString = string;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: EnvString;
  readonly VITE_SUPABASE_ANON_KEY: EnvString;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
