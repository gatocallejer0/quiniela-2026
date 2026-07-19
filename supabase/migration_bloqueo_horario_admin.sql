-- ============================================================
--  Bloquea a los administradores de editar marcadores hasta 10
--  minutos antes de que el partido inicie — mismo cierre que ya
--  aplica a los pronósticos de los usuarios.
-- ============================================================

drop policy if exists "admin edita partidos" on partidos;

create policy "admin edita partidos" on partidos
  for update using (
    exists (select 1 from perfiles where id = auth.uid() and es_admin)
    and inicio <= now() + interval '10 minutes'
  );
