-- ============================================================
--  Tercer Lugar y Final · Mundial 2026
--  multiplicador = 5  |  fase = '3er puesto' / 'Final'
--  Horas en UTC (Guatemala UTC-6 → +6h)
-- ============================================================

-- Los IDs 215/216 ya existen (placeholders insertados antes) → update en vez de insert
update partidos set
  equipo_local     = 'Francia',
  equipo_visitante = 'Inglaterra',
  inicio           = '2026-07-18 21:00:00+00',
  fase             = '3er puesto',
  multiplicador    = 5
where id = 215;

update partidos set
  equipo_local     = 'España',
  equipo_visitante = 'Argentina',
  inicio           = '2026-07-19 19:00:00+00',
  fase             = 'Final',
  multiplicador    = 5
where id = 216;
