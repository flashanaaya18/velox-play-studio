// ─── Velox Play — Configuración de ejecución ────────────────────────
// Copia este archivo a `js/config.js` y rellena los valores.
// `js/config.js` está en .gitignore → NUNCA se sube a GitHub.
//
// Nota: la clave `SUPABASE_KEY` es una PUBLISHABLE / anon key: es
// segura para exponer en el cliente siempre que Supabase tenga RLS
// activo en todas las tablas. La service_role key JAMÁS debe estar
// en el cliente.
// ────────────────────────────────────────────────────────────────────
window.VELOX_CONFIG = {
  SUPABASE_URL: "https://TU_PROYECTO.supabase.co",
  SUPABASE_KEY: "sb_publishable_xxx",   // publishable / anon, no service_role
  PAGE_SIZE: 20,
  HERO_POOL: 10,       // de cuántos títulos TOP se elige el hero aleatorio
  // Bot de Telegram que recibe los reportes (mismo que la app Android).
  TELEGRAM_BOT_TOKEN: "xxx:yyy",
  TELEGRAM_CHAT_ID: "-100xxxxxxxxxx"
};
