-- Solicitudes de plan VIP de usuarios gratis (app y web).
-- El cliente solo puede INSERTAR; tú las ves en Supabase → Table Editor → solicitudes_vip,
-- cobras y creas el código VIP desde el panel.

create table if not exists public.solicitudes_vip (
  id            bigserial primary key,
  plan_id       text not null,
  plan_nombre   text not null,
  precio_mxn    int  not null,
  device_id     text,
  nombre_perfil text,
  contacto      text,
  origen        text not null default 'app',
  atendida      boolean not null default false,
  created_at    timestamptz not null default now()
);
alter table public.solicitudes_vip enable row level security;

alter table public.solicitudes_vip drop constraint if exists solicitudes_vip_chk;
alter table public.solicitudes_vip add constraint solicitudes_vip_chk check (
  plan_id in ('mes_1','mes_3','mes_6','ano_1') and
  precio_mxn between 1 and 5000 and
  char_length(plan_nombre) <= 40 and
  (device_id is null or char_length(device_id) <= 100) and
  (nombre_perfil is null or char_length(nombre_perfil) <= 60) and
  (contacto is null or char_length(contacto) <= 120) and
  origen in ('app','web')
);

drop policy if exists solicitudes_vip_insert on public.solicitudes_vip;
create policy solicitudes_vip_insert on public.solicitudes_vip
  for insert to anon, authenticated
  with check (atendida = false);

revoke select, update, delete on public.solicitudes_vip from anon, authenticated;
grant insert on public.solicitudes_vip to anon, authenticated;
grant usage, select on sequence public.solicitudes_vip_id_seq to anon, authenticated;
