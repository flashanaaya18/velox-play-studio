// Supabase Edge Function: reporte-telegram
// Disparada por un Database Webhook (INSERT en public.reportes).
// Reenvía el reporte al chat de Telegram. El token vive SOLO en los
// secrets de Supabase (nunca en el navegador ni en la app).
//
// Deploy:
//   supabase functions deploy reporte-telegram --no-verify-jwt
//   supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... WEBHOOK_SECRET=...
// Webhook: Database → Webhooks → tabla reportes, INSERT, POST a
//   https://iqebalrrvjmbtemlrigt.supabase.co/functions/v1/reporte-telegram
//   con header  x-webhook-secret: <WEBHOOK_SECRET>

const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const CHAT = Deno.env.get("TELEGRAM_CHAT_ID") ?? "";
const SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";

function esc(v: unknown, max = 2000): string {
  return String(v ?? "").slice(0, max)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Comparación en tiempo constante del secreto.
function igual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!SECRET || !igual(req.headers.get("x-webhook-secret") ?? "", SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!TOKEN || !CHAT) return new Response("Not configured", { status: 500 });

  let payload: { type?: string; table?: string; record?: Record<string, unknown> };
  try { payload = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }
  if (payload.type !== "INSERT" || payload.table !== "reportes" || !payload.record) {
    return new Response("Ignored", { status: 200 });
  }
  const r = payload.record;

  const texto =
    `🚨 <b>Reporte de usuario</b>\n\n` +
    `🎬 <b>Título:</b> ${esc(r.titulo, 200)}\n` +
    `⚠️ <b>Motivo:</b> ${esc(r.motivo, 100)}\n` +
    (r.detalle ? `💬 <b>Detalles:</b>\n${esc(r.detalle)}\n` : "") +
    (r.url ? `🌐 <b>URL:</b> ${esc(r.url, 500)}\n` : "") +
    `\n⏰ ${esc(r.created_at, 40)}  #${esc(r.id, 20)}`;

  const tg = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT, text: texto, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  if (!tg.ok) {
    console.error("telegram", tg.status, await tg.text());
    return new Response("Telegram error", { status: 502 });
  }
  return new Response("ok", { status: 200 });
});
