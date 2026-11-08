-- ════════════════════════════════════════════════════════════════════
--  Velox Play / Cinemaxplus — Endurecimiento RLS (idempotente)
--  Proyecto: https://iqebalrrvjmbtemlrigt.supabase.co
--  Pegar completo en Supabase → SQL Editor → Run. Se puede re-ejecutar.
-- ════════════════════════════════════════════════════════════════════
--
--  QUÉ HACE
--   * Catálogo (peliculas, series, temporadas, episodios, *_servidores,
--     vistas v_pelis_lista / v_series_lista, rpc obtener_serie_completa):
--     anon/authenticated SOLO LECTURA. Se eliminan las políticas
--     "escr_*" (supabase_write_policies.sql) que dejaban a CUALQUIERA con
--     la publishable key escribir/borrar el catálogo.
--     → El panel admin (velox_panel_supabase.html) ahora escribe con la
--       service_role / sb_secret key pegada en la sesión (bypassa RLS).
--   * reportes: anon solo INSERT (con límites de longitud y rate limit),
--     sin SELECT. Lo lee la Edge Function con service_role.
--   * configuracion / canales / velox_gol (si existen): solo SELECT.
--   * favoritos / watch_progress / temas / codigos_vip: ver "LIMITACIONES".
--
--  LIMITACIONES (operaciones que se dejaron ABIERTAS para no romper la app)
--   La app Android NO usa Supabase Auth: identifica al usuario con un id de
--   dispositivo/usuario en texto (user_id) y usa siempre la publishable key.
--   Sin auth.uid() Postgres no puede saber "quién" pide, así que:
--   1) favoritos, watch_progress: anon conserva SELECT/INSERT/UPDATE/DELETE
--      (la app hace upsert + delete + get filtrando por user_id). Cualquiera
--      con la key puede leer/borrar el progreso de otro si adivina su
--      user_id. Mitigación aplicada: límites de tamaño por columna.
--      Arreglo real: migrar a Supabase Auth anónimo (signInAnonymously) y
--      usar las políticas "owner" del bloque OPCIONAL B.
--   2) temas: la app (pantalla admin) hace upsert/patch → escritura abierta.
--   3) codigos_vip: la app lista TODOS los códigos, crea (upsert con
--      es_admin), activa y borra desde la propia app → TODO abierto. Es el
--      riesgo más alto: cualquiera puede leer todos los códigos o crearse
--      uno VIP/admin. Arreglo: mover la administración de VIP al panel
--      (service key) y que la app canjee con la RPC del bloque OPCIONAL A.
--
--  DESPLIEGUE DE REPORTES → TELEGRAM (el token ya NO está en el navegador)
--   0. URGENTE: revocar el token actual en @BotFather (/revoke) — está en
--      el historial git de velox-play-studio (js/config.js, commit 309c758)
--      y hardcodeado en la app Android (ServicioReportes.kt). Generar uno nuevo.
--   1. supabase functions deploy reporte-telegram --no-verify-jwt
--   2. supabase secrets set TELEGRAM_BOT_TOKEN=<nuevo> TELEGRAM_CHAT_ID=-100...
--         WEBHOOK_SECRET=<cadena aleatoria larga>
--   3. Dashboard → Database → Webhooks → Create: tabla public.reportes,
--      evento INSERT, tipo "Supabase Edge Functions" (o HTTP POST a
--      https://iqebalrrvjmbtemlrigt.supabase.co/functions/v1/reporte-telegram),
--      header  x-webhook-secret: <WEBHOOK_SECRET>.
-- ════════════════════════════════════════════════════════════════════

begin;

-- ─── 1. Catálogo: RLS + solo lectura ─────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['peliculas','pelicula_servidores','series',
                           'temporadas','episodios','episodio_servidores']
  loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I enable row level security', t);
    -- políticas antiguas permisivas / con nombre conocido
    execute format('drop policy if exists "escr_pelis"  on public.%I', t);
    execute format('drop policy if exists "escr_pelsrv" on public.%I', t);
    execute format('drop policy if exists "escr_series" on public.%I', t);
    execute format('drop policy if exists "escr_temps"  on public.%I', t);
    execute format('drop policy if exists "escr_eps"    on public.%I', t);
    execute format('drop policy if exists "escr_epsrv"  on public.%I', t);
    execute format('drop policy if exists "catalogo_lectura" on public.%I', t);
    -- privilegios: solo SELECT para clientes
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('create policy "catalogo_lectura" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;
-- Las políticas "lectura_publica_*" originales también son SELECT-only;
-- se dejan (son redundantes con "catalogo_lectura", no dañan).

-- ─── 2. Vistas: security_invoker → respetan el RLS de las tablas base ─
do $$
declare v text;
begin
  foreach v in array array['v_pelis_lista','v_series_lista'] loop
    if to_regclass('public.' || v) is null then continue; end if;
    execute format('alter view public.%I set (security_invoker = on)', v);
    execute format('revoke all on public.%I from anon, authenticated', v);
    execute format('grant select on public.%I to anon, authenticated', v);
  end loop;
end $$;

-- RPC usada por la app (series completas). Es SECURITY INVOKER (por defecto):
-- respeta RLS. Solo se garantiza el EXECUTE.
do $$ begin
  if to_regprocedure('public.obtener_serie_completa(text)') is not null then
    revoke all on function public.obtener_serie_completa(text) from public;
    grant execute on function public.obtener_serie_completa(text) to anon, authenticated;
  end if;
end $$;

-- ─── 3. Tablas de configuración: solo lectura ────────────────────────
do $$
declare t text;
begin
  foreach t in array array['configuracion','canales','velox_gol'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "config_lectura" on public.%I', t);
    execute format('revoke insert, update, delete, truncate on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('create policy "config_lectura" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

-- ─── 4. reportes: anon INSERT-only ───────────────────────────────────
create table if not exists public.reportes (
  id         bigserial primary key,
  titulo     text not null,
  motivo     text not null,
  detalle    text,
  url        text,
  created_at timestamptz not null default now()
);
alter table public.reportes enable row level security;

alter table public.reportes drop constraint if exists reportes_len_chk;
alter table public.reportes add constraint reportes_len_chk check (
  char_length(titulo)  between 1 and 200 and
  char_length(motivo)  between 1 and 100 and
  (detalle is null or char_length(detalle) <= 2000) and
  (url     is null or char_length(url)     <= 500)
);

revoke all on public.reportes from anon, authenticated;
grant insert (titulo, motivo, detalle, url) on public.reportes to anon, authenticated;
grant usage on sequence public.reportes_id_seq to anon, authenticated;

drop policy if exists "reportes_insert_anon" on public.reportes;
create policy "reportes_insert_anon" on public.reportes
  for insert to anon, authenticated
  with check (char_length(titulo) <= 200 and char_length(motivo) <= 100);
-- Sin política SELECT/UPDATE/DELETE → nadie salvo service_role los lee.

-- Rate limit global anti-spam: máx. 20 reportes por minuto.
create or replace function public.reportes_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.reportes where created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Demasiados reportes, intenta más tarde' using errcode = '54000';
  end if;
  new.created_at := now();   -- el cliente no puede falsear la fecha
  return new;
end $$;
revoke all on function public.reportes_rate_limit() from public, anon, authenticated;
drop trigger if exists trg_reportes_rate_limit on public.reportes;
create trigger trg_reportes_rate_limit before insert on public.reportes
  for each row execute function public.reportes_rate_limit();
create index if not exists reportes_created_at_idx on public.reportes (created_at desc);

-- ─── 5. favoritos / watch_progress (sin Supabase Auth) ───────────────
-- Se mantiene CRUD anon (la app lo necesita) pero con política con nombre
-- propio y validaciones de tamaño; se reemplazan las "for all using(true)".
do $$
declare t text;
begin
  foreach t in array array['favoritos','watch_progress'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "wp_rw_anon"  on public.%I', t);
    execute format('drop policy if exists "fav_rw_anon" on public.%I', t);
    execute format('drop policy if exists "dispositivo_rw" on public.%I', t);
    execute format('revoke truncate, references, trigger on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
    execute format($p$create policy "dispositivo_rw" on public.%I for all to anon, authenticated
                     using (true)
                     with check (char_length(user_id) between 1 and 128
                                 and char_length(content_id) between 1 and 256)$p$, t);
  end loop;
end $$;

-- ─── 6. temas y codigos_vip: abiertos (la app los administra) ────────
do $$
declare t text;
begin
  foreach t in array array['temas','codigos_vip'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "app_rw" on public.%I', t);
    execute format('revoke truncate, references, trigger on public.%I from anon, authenticated', t);
    execute format('create policy "app_rw" on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

commit;

-- ════════════════════════════════════════════════════════════════════
--  OPCIONAL A — codigos_vip estricto (ROMPE la administración VIP dentro
--  de la app: crear/listar/borrar pasa a hacerse solo desde el panel).
--  Requiere cambiar la app para canjear con:  POST rest/v1/rpc/validar_codigo_vip
-- ════════════════════════════════════════════════════════════════════
-- create or replace function public.validar_codigo_vip(p_codigo text)
-- returns table(activo boolean, fecha_fin text, fecha_fin_ms bigint)
-- language sql stable security definer set search_path = public as $$
--   select activo, fecha_fin::text, fecha_fin_ms from public.codigos_vip
--   where codigo = upper(trim(p_codigo)) limit 1
-- $$;
-- grant execute on function public.validar_codigo_vip(text) to anon;
-- drop policy if exists "app_rw" on public.codigos_vip;
-- revoke all on public.codigos_vip from anon, authenticated;

-- ════════════════════════════════════════════════════════════════════
--  OPCIONAL B — favoritos/watch_progress por dueño real (requiere que la
--  app use Supabase Auth anónimo y guarde user_id = auth.uid()::text).
-- ════════════════════════════════════════════════════════════════════
-- do $$ declare t text; begin
--   foreach t in array array['favoritos','watch_progress'] loop
--     execute format('drop policy if exists "dispositivo_rw" on public.%I', t);
--     execute format('revoke all on public.%I from anon', t);
--     execute format($p$create policy "owner_rw" on public.%I for all to authenticated
--       using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text)$p$, t);
--   end loop;
-- end $$;
