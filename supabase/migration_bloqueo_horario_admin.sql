-- ============================================================
--  Bloquea a los administradores de editar marcadores antes de
--  que el partido haya iniciado ("fuera de horario").
-- ============================================================

drop policy if exists "admin edita partidos" on partidos;

create policy "admin edita partidos" on partidos
  for update using (
    exists (select 1 from perfiles where id = auth.uid() and es_admin)
    and inicio <= now()
  );
