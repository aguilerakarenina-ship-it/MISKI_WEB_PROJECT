-- ════════════════════════════════════════════════════════════
--  MISKI · Esquema de base de datos para Supabase (PostgreSQL)
--  Ejecutar en: Supabase → SQL Editor → New query → Run
-- ════════════════════════════════════════════════════════════

-- ── 1. AUXILIARES (Asistentes subvencionados REVIBO) ──────────
create table if not exists auxiliares (
  id          bigint primary key,
  nombre      text not null,
  iniciales   text,
  rut         text,
  valor_hora  numeric not null default 13,
  color       text default 'green',
  activo      boolean default true,
  created_at  timestamptz default now()
);

-- ── 2. USUARIOS (Asociados y externos) ────────────────────────
create table if not exists usuarios (
  id          bigint primary key,
  nombre      text not null,
  ci          text,
  telefono    text,
  direccion   text,
  tipo        text not null check (tipo in ('asociado','externo')),
  obs         text,
  created_at  timestamptz default now()
);

-- ── 3. ASISTENCIA (Entradas / salidas diarias) ────────────────
create table if not exists asistencia (
  id          bigint primary key,
  aux_id      bigint references auxiliares(id) on delete cascade,
  usuario_id  bigint references usuarios(id) on delete set null,
  fecha       date not null,
  entrada     time,
  salida      time,
  horas       numeric,
  created_at  timestamptz default now()
);

-- ── 4. TURNOS (Cronograma mensual) ────────────────────────────
create table if not exists turnos (
  id          bigint primary key,
  aux_id      bigint references auxiliares(id) on delete cascade,
  usuario_id  bigint references usuarios(id) on delete set null,
  fecha       date not null,
  turno       text,            -- 'mañana' | 'tarde' | 'noche'
  hora_inicio time,
  hora_fin    time,
  horas       numeric,
  paciente    text,            -- nombre del usuario asociado (display)
  created_at  timestamptz default now()
);

-- ── 5. VENTAS (Servicios de asistencia personal a externos) ───
create table if not exists ventas (
  id              bigint primary key,
  usuario_id      bigint references usuarios(id) on delete cascade,
  aux_id          bigint references auxiliares(id) on delete cascade,
  fecha           date not null,
  hora_inicio     time,
  hora_fin        time,
  horas           numeric,
  pago_asistente  numeric,
  cobro_usuario   numeric,
  retencion       numeric,
  created_at      timestamptz default now()
);

-- ════════════════════════════════════════════════════════════
--  Índices recomendados
-- ════════════════════════════════════════════════════════════
create index if not exists idx_asistencia_fecha on asistencia(fecha);
create index if not exists idx_asistencia_aux   on asistencia(aux_id);
create index if not exists idx_turnos_fecha     on turnos(fecha);
create index if not exists idx_turnos_aux       on turnos(aux_id);
create index if not exists idx_ventas_fecha     on ventas(fecha);

-- ════════════════════════════════════════════════════════════
--  Seguridad: Row Level Security (RLS)
--  La app usa la clave "anon" desde el navegador. Para que la
--  app pueda leer/escribir, se habilita RLS con políticas
--  abiertas a "anon" y "authenticated". Si más adelante agregas
--  inicio de sesión, puedes restringir estas políticas.
-- ════════════════════════════════════════════════════════════
alter table auxiliares enable row level security;
alter table usuarios   enable row level security;
alter table asistencia enable row level security;
alter table turnos     enable row level security;
alter table ventas     enable row level security;

create policy "auxiliares_all" on auxiliares
  for all using (true) with check (true);

create policy "usuarios_all" on usuarios
  for all using (true) with check (true);

create policy "asistencia_all" on asistencia
  for all using (true) with check (true);

create policy "turnos_all" on turnos
  for all using (true) with check (true);

create policy "ventas_all" on ventas
  for all using (true) with check (true);
