/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string
  readonly VITE_DEBUG: string
  readonly VITE_OLLAMA_URL: string
  readonly VITE_SHOW_HEALTH_BAR: string
  readonly DEV: boolean
  readonly PROD: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
