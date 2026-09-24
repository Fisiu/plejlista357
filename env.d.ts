/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly BASE_URL: string;
    readonly VITE_SPOTIFY_CLIENT_ID?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
