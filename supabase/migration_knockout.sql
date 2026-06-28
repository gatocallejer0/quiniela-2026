-- ============================================================
--  MIGRACIÓN: Fases Eliminatorias (Dieciseisavos en adelante)
--  Pega esto en el SQL Editor de Supabase y ejecútalo.
-- ============================================================

-- 1. Nuevas columnas en partidos
--    goles_local_final / goles_visitante_final ya existen y representan
--    el marcador a 90 minutos (mismo significado que en grupos).
--    clasificado  → equipo que realmente avanza (puede ser distinto al
--                   ganador a 90 min si hay prórroga/penales).
--    multiplicador → x1 Dieciseisavos, x2 Octavos, x3 Cuartos,
--                    x4 Semifinal, x5 Final.

alter table partidos
  add column if not exists clasificado   text,
  add column if not exists multiplicador int not null default 1;

-- 2. Nueva columna en pronosticos
--    El usuario predice quién avanza (solo para fases eliminatorias).
--    NULL para partidos de grupos (retrocompatible).

alter table pronosticos
  add column if not exists clasificado text;

-- 3. Vista de tabla actualizada
--    Fórmula por partido:
--      pts_marcador   = 3 (exacto) | 1 (resultado) | 0 (fallo)  — a 90 min
--      bonus_clasif   = 2 si pr.clasificado = p.clasificado, 0 si no
--      total_partido  = (pts_marcador + bonus_clasif) * p.multiplicador
--
--    Para grupos: clasificado = NULL en ambas tablas → bonus = 0,
--    multiplicador = 1 → mismo resultado que antes. ✓

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
        -- Puntos de marcador (evaluado solo con el resultado a 90 min)
        case
          when pr.goles_local = p.goles_local_final
           and pr.goles_visitante = p.goles_visitante_final then 3
          when sign(pr.goles_local - pr.goles_visitante)
             = sign(p.goles_local_final - p.goles_visitante_final) then 1
          else 0
        end
        -- Bonus clasificado: +2 si acierta el equipo que avanza
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
left join pronosticos pr on pr.usuario_id = pf.id
left join partidos p     on p.id = pr.partido_id
group by pf.id, pf.nombre, pf.pagado;

grant select on vista_tabla to anon, authenticated;

-- ============================================================
--  EJEMPLOS DE VALIDACIÓN (México vs Croacia, predicción 2-1 México,
--  avanza México, multiplicador x1):
--
--  Termina 2-1 México    → (3 + 2) × 1 = 5  ✓
--  Termina 3-0 México    → (1 + 2) × 1 = 3  ✓
--  1-1, pasa México pen  → (0 + 2) × 1 = 2  ✓
--  1-1, pasa Croacia pen → (0 + 0) × 1 = 0  ✓
-- ============================================================

-- ============================================================
--  CÓMO INSERTAR LOS PARTIDOS DE DIECISEISAVOS
--  (ejecuta esto DESPUÉS de conocer los cruces reales)
--
--  insert into partidos
--    (id, equipo_local, equipo_visitante, inicio, fase, multiplicador)
--  values
--    (201, 'País A', 'País B', '2026-06-28 18:00:00+00', 'Dieciseisavos', 1),
--    ...;
--
--  Para actualizar equipos si ya existían con nombres placeholder:
--    update partidos
--      set equipo_local = 'País A', equipo_visitante = 'País B'
--      where id = 201;
-- ============================================================
