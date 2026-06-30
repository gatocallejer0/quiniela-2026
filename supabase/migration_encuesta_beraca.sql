-- ============================================================
--  ENCUESTA CONVIVENCIA BERACA
-- ============================================================

create table if not exists encuesta_beraca (
  usuario_id    uuid primary key references auth.users(id) on delete cascade,
  asiste        boolean not null,
  acompanantes  int not null default 0 check (acompanantes >= 0),
  creado        timestamptz not null default now()
);

alter table encuesta_beraca enable row level security;

-- Cada usuario solo ve y edita su propia respuesta
create policy "encuesta: ver propia" on encuesta_beraca
  for select using (usuario_id = auth.uid());

create policy "encuesta: insertar propia" on encuesta_beraca
  for insert with check (usuario_id = auth.uid());

-- Admin puede ver todas las respuestas
create policy "encuesta: admin ve todo" on encuesta_beraca
  for select using (
    exists (select 1 from perfiles where id = auth.uid() and es_admin)
  );
