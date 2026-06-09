-- Datos de EJEMPLO para probar la app antes de cargar el calendario real.
-- Estas fechas están a futuro para que se pueda pronosticar; cámbialas por
-- las reales generadas con scripts/parse-ics.mjs a partir de tu .ics.
delete from partidos;
insert into partidos (id, equipo_local, equipo_visitante, inicio, grupo, fase) values
  (1, 'México', 'Canadá',        '2026-06-11T20:00:00Z', 'Grupo A', null),
  (2, 'Estados Unidos', 'Gales', '2026-06-12T22:00:00Z', 'Grupo B', null),
  (3, 'Argentina', 'Brasil',     '2026-06-13T01:00:00Z', 'Grupo C', null),
  (4, 'Guatemala', 'Honduras',   '2026-06-14T20:00:00Z', 'Grupo D', null),
  (5, 'Francia', 'Alemania',     '2026-06-15T18:00:00Z', 'Grupo E', null);
