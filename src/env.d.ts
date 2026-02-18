/// <reference types="vite/client" />

type EnvString = string;

interface ImportMetaEnv {
  readonly VITE_API_URL: EnvString;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
