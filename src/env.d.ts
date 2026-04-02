/// <reference types="vite/client" />

type EnvString = string;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: EnvString;
  readonly VITE_SUPABASE_ANON_KEY: EnvString;
  readonly VITE_AUTH_REDIRECT_URL?: EnvString;
  readonly VITE_AUTH_RECOVERY_REDIRECT_URL?: EnvString;
  readonly VITE_RULES_PUBLIC_URL?: EnvString;
  readonly VITE_RULES_BUCKET?: EnvString;
  readonly VITE_RULES_FILE_PATH?: EnvString;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
