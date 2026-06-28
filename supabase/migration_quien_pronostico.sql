-- ============================================================
--  Función SECURITY DEFINER: quién pronosticó partidos próximos
--  Devuelve solo (partido_id, usuario_id) — SIN marcadores ni
--  ningún dato del pronóstico. Bypasea RLS únicamente para
--  exponer el booleano "¿pronosticó sí/no?".
-- ============================================================

create or replace function quien_ya_pronostico_proximos()
returns table(partido_id bigint, usuario_id uuid)
language sql
security definer
stable
as $$
  select partido_id, usuario_id
  from pronosticos
  where partido_id in (
    select id from partidos
    where finalizado = false
      and inicio > now()
  );
$$;

grant execute on function quien_ya_pronostico_proximos() to authenticated;
