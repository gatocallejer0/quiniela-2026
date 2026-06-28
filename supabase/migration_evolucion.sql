-- ============================================================
--  MIGRACIÓN: Vista puntos por jornada para gráfica de evolución
--  Cada "jornada" = un día calendario con partidos (hora GT).
--  Cross-join perfiles × jornadas → todos los usuarios en cada día.
--  Solo incluye días con partidos finalizados → sin ceros futuros.
-- ============================================================

drop view if exists vista_puntos_por_fase;

create or replace view vista_puntos_por_jornada as
with jornadas as (
  select distinct
    date_trunc('day', inicio at time zone 'America/Guatemala') as dia,
    dense_rank() over (
      order by date_trunc('day', inicio at time zone 'America/Guatemala')
    ) as num
  from partidos
  where finalizado = true
)
select
  pf.id        as usuario_id,
  pf.nombre,
  j.num        as jornada_num,
  'J' || j.num as jornada,
  coalesce(sum(
    case
      when not p.finalizado or p.goles_local_final is null then 0
      else (
        case
          when pr.goles_local = p.goles_local_final
           and pr.goles_visitante = p.goles_visitante_final then 3
          when sign(pr.goles_local - pr.goles_visitante)
             = sign(p.goles_local_final - p.goles_visitante_final) then 1
          else 0
        end
        + case
            when p.clasificado is not null
             and pr.clasificado is not null
             and pr.clasificado = p.clasificado then 2
            else 0
          end
      ) * p.multiplicador
    end
  ), 0) as puntos
from perfiles pf
cross join jornadas j
join partidos p
  on date_trunc('day', p.inicio at time zone 'America/Guatemala') = j.dia
 and p.finalizado = true
left join pronosticos pr
  on pr.usuario_id = pf.id
 and pr.partido_id = p.id
group by pf.id, pf.nombre, j.num;

grant select on vista_puntos_por_jornada to anon, authenticated;
