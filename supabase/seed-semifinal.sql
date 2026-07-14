-- ============================================================
--  Semifinales · Mundial 2026
--  multiplicador = 4  |  fase = 'Semifinal'
--  Horas en UTC (Guatemala UTC-6 → +6h)
-- ============================================================

-- Los IDs 213/214 ya existen (placeholders de una fase anterior) → update en vez de insert
update partidos set
  equipo_local     = 'Francia',
  equipo_visitante = 'España',
  inicio           = '2026-07-14 19:00:00+00',
  fase             = 'Semifinal',
  multiplicador    = 4
where id = 213;

update partidos set
  equipo_local     = 'Inglaterra',
  equipo_visitante = 'Argentina',
  inicio           = '2026-07-15 19:00:00+00',
  fase             = 'Semifinal',
  multiplicador    = 4
where id = 214;
