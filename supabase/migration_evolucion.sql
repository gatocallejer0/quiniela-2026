-- ============================================================
--  MIGRACIÓN: Vista puntos por fase para gráfica de evolución
--  Pega en el SQL Editor de Supabase y ejecuta.
-- ============================================================
--
--  Fórmula idéntica a vista_tabla (migration_knockout.sql).
--  Cross-join perfiles × fases-jugadas garantiza que todos los
--  usuarios aparezcan en cada fase, aunque tengan 0 puntos.
--  Solo incluye partidos con finalizado = true → no hay ceros futuros.
-- ============================================================

create or replace view vista_puntos_por_fase as
select
  pf.id   as usuario_id,
  pf.nombre,
  coalesce(p.fase, 'Grupos') as fase,
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
cross join (
  select distinct coalesce(fase, 'Grupos') as fase_key
  from partidos
  where finalizado = true
) fases_jugadas
join partidos p
  on coalesce(p.fase, 'Grupos') = fases_jugadas.fase_key
 and p.finalizado = true
left join pronosticos pr
  on pr.usuario_id = pf.id
 and pr.partido_id = p.id
group by pf.id, pf.nombre, coalesce(p.fase, 'Grupos');

grant select on vista_puntos_por_fase to anon, authenticated;
