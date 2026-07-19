-- ============================================================
--  QUINIELA FAMILIAR · MUNDIAL 2026 — Esquema de Supabase
--  Pega TODO esto en el SQL Editor de tu proyecto y ejecútalo.
-- ============================================================

-- ---------- PERFILES (nombre visible + bandera admin) ----------
create table if not exists perfiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  nombre    text not null,
  es_admin  boolean not null default false,
  pagado    boolean not null default false,
  creado    timestamptz not null default now()
);

-- ---------- PARTIDOS ----------
create table if not exists partidos (
  id                     bigint primary key,
  equipo_local           text not null,
  equipo_visitante       text not null,
  inicio                 timestamptz not null,   -- instante real en UTC
  grupo                  text,
  fase                   text,
  goles_local_final      int,
  goles_visitante_final  int,
  finalizado             boolean not null default false
);
create index if not exists idx_partidos_inicio on partidos (inicio);

-- ---------- PRONOSTICOS ----------
create table if not exists pronosticos (
  id              bigint generated always as identity primary key,
  usuario_id      uuid not null references auth.users(id) on delete cascade,
  partido_id      bigint not null references partidos(id) on delete cascade,
  goles_local     int not null check (goles_local >= 0),
  goles_visitante int not null check (goles_visitante >= 0),
  creado          timestamptz not null default now(),
  unique (usuario_id, partido_id)
);

-- ============================================================
--  SEGURIDAD (Row Level Security)
-- ============================================================
alter table perfiles    enable row level security;
alter table partidos    enable row level security;
alter table pronosticos enable row level security;

-- PERFILES: todos pueden ver los nombres (para la tabla); cada quien edita el suyo
create policy "perfiles visibles" on perfiles
  for select using (true);
create policy "crear mi perfil" on perfiles
  for insert with check (id = auth.uid());
create policy "editar mi perfil" on perfiles
  for update using (id = auth.uid());
create policy "admin actualiza perfiles" on perfiles
  for update using (
    exists (select 1 from perfiles where id = auth.uid() and es_admin)
  );

-- PARTIDOS: todos los ven; solo admin crea/edita
create policy "partidos visibles" on partidos
  for select using (true);
create policy "admin inserta partidos" on partidos
  for insert with check (
    exists (select 1 from perfiles where id = auth.uid() and es_admin)
  );
-- Mismo cierre que los pronósticos: se bloquea 10 minutos antes del inicio
create policy "admin edita partidos" on partidos
  for update using (
    exists (select 1 from perfiles where id = auth.uid() and es_admin)
    and inicio <= now() + interval '10 minutes'
  );

-- PRONOSTICOS:
--  - ver: los propios siempre; los de otros SOLO si el partido ya empezó
--  - crear/editar: solo los propios y SOLO antes de que empiece el partido
create policy "ver propios o ya iniciados" on pronosticos
  for select using (
    usuario_id = auth.uid()
    or exists (
      select 1 from partidos p
      where p.id = partido_id and p.inicio <= now()
    )
  );

create policy "insertar antes del inicio" on pronosticos
  for insert with check (
    usuario_id = auth.uid()
    and exists (
      select 1 from partidos p
      where p.id = partido_id and p.inicio > now() + interval '10 minutes'
    )
  );

create policy "actualizar antes del inicio" on pronosticos
  for update using (usuario_id = auth.uid())
  with check (
    usuario_id = auth.uid()
    and exists (
      select 1 from partidos p
      where p.id = partido_id and p.inicio > now() + interval '10 minutes'
    )
  );

-- ============================================================
--  TABLA DE POSICIONES (vista)
--  3 = marcador exacto · 1 = acierta el resultado · 0 = falla
-- ============================================================
create or replace view vista_tabla as
select
  pf.id   as usuario_id,
  pf.nombre,
  pf.pagado,
  count(pr.id) filter (where p.finalizado) as jugados,
  coalesce(sum(
    case
      when not p.finalizado or p.goles_local_final is null then 0
      when pr.goles_local = p.goles_local_final
       and pr.goles_visitante = p.goles_visitante_final then 3
      when sign(pr.goles_local - pr.goles_visitante)
         = sign(p.goles_local_final - p.goles_visitante_final) then 1
      else 0
    end
  ), 0) as puntos
from perfiles pf
left join pronosticos pr on pr.usuario_id = pf.id
left join partidos p     on p.id = pr.partido_id
group by pf.id, pf.nombre, pf.pagado;

grant select on vista_tabla to anon, authenticated;

-- ============================================================
--  PREMIOS — el admin define qué gana cada posición
-- ============================================================
create table if not exists premios (
  id          bigint generated always as identity primary key,
  posicion    int not null unique,       -- 1 = 1er lugar, 2 = 2do, etc.
  descripcion text not null,             -- "Q500 en efectivo", "Cena familiar", …
  valor       text,                      -- opcional: monto, equivalente, etc.
  creado      timestamptz not null default now()
);

alter table premios enable row level security;

create policy "premios visibles" on premios
  for select using (true);

create policy "admin gestiona premios" on premios
  for all using (
    exists (select 1 from perfiles where id = auth.uid() and es_admin)
  );

-- ============================================================
--  PREMIOS ADICIONALES — premios por participación sin lugar específico
-- ============================================================
create table if not exists premios_adicionales (
  id          bigint generated always as identity primary key,
  descripcion text not null,
  valor       text,
  creado      timestamptz not null default now()
);

alter table premios_adicionales enable row level security;

create policy "premios adicionales visibles" on premios_adicionales
  for select using (true);

create policy "admin gestiona premios adicionales" on premios_adicionales
  for all using (
    exists (select 1 from perfiles where id = auth.uid() and es_admin)
  );

-- ============================================================
--  REGLAS — el admin define las reglas de la quiniela (solo informativo)
-- ============================================================
create table if not exists reglas (
  id          bigint generated always as identity primary key,
  orden       int not null default 0,
  titulo      text not null,
  descripcion text,
  creado      timestamptz not null default now()
);

alter table reglas enable row level security;

create policy "reglas visibles" on reglas
  for select using (true);

create policy "admin gestiona reglas" on reglas
  for all using (
    exists (select 1 from perfiles where id = auth.uid() and es_admin)
  );

-- ============================================================
--  CÓMO NOMBRAR AL ADMIN (ejecútalo después de crear tu cuenta):
--    update perfiles set es_admin = true where nombre = 'César';
-- ============================================================
