-- Actualiza vista_tabla para incluir puntos_adicionales en el total.
-- Los puntos de dinámicas/actividades ahora suman directamente al puntaje principal.

create or replace view vista_tabla as
select
  pf.id   as usuario_id,
  pf.nombre,
  pf.pagado,
  count(pr.id) filter (where p.finalizado) as jugados,
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
  ), 0) + coalesce(pa.puntos, 0) as puntos
from perfiles pf
left join pronosticos pr on pr.usuario_id = pf.id
left join partidos p     on p.id = pr.partido_id
left join puntos_adicionales pa on pa.usuario_id = pf.id
group by pf.id, pf.nombre, pf.pagado, pa.puntos;

grant select on vista_tabla to anon, authenticated;
