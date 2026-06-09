#!/usr/bin/env node
/**
 * parse-ics.mjs — Convierte un archivo .ics del Mundial en INSERTs para Supabase.
 *
 * Uso:
 *   node scripts/parse-ics.mjs ruta/al/calendario.ics > supabase/seed.sql
 *
 * Luego pega el contenido de supabase/seed.sql en el SQL Editor de Supabase.
 *
 * Notas:
 *  - DTSTART con "Z" se trata como UTC.
 *  - DTSTART con TZID de Guatemala (o sin TZID) se asume hora local GT (UTC-6)
 *    y se convierte al instante UTC correcto sumando 6 horas.
 *  - El nombre de los equipos se extrae del SUMMARY. Patrones soportados:
 *      "Mexico vs Canada" | "Mexico v Canada" | "Mexico - Canada" | "Mexico x Canada"
 *    Un prefijo tipo "Grupo A: " o "Partido 12 - " se ignora para los equipos
 *    pero se intenta usar como grupo/fase.
 */

import { readFileSync } from "node:fs";

const ruta = process.argv[2];
if (!ruta) {
  console.error("Falta la ruta del .ics.  Ej: node scripts/parse-ics.mjs cal.ics > supabase/seed.sql");
  process.exit(1);
}

// Desdobla líneas plegadas (RFC 5545: continúan con espacio o tab al inicio)
const raw = readFileSync(ruta, "utf8").replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
const lineas = raw.split("\n");

const eventos = [];
let actual = null;
for (const l of lineas) {
  if (l.startsWith("BEGIN:VEVENT")) actual = {};
  else if (l.startsWith("END:VEVENT")) {
    if (actual) eventos.push(actual);
    actual = null;
  } else if (actual) {
    const i = l.indexOf(":");
    if (i === -1) continue;
    const clave = l.slice(0, i); // puede traer parámetros: DTSTART;TZID=...
    const valor = l.slice(i + 1);
    const nombre = clave.split(";")[0].toUpperCase();
    if (nombre === "DTSTART") {
      actual.dtRaw = valor;
      actual.dtParams = clave;
    } else if (nombre === "SUMMARY") actual.summary = valor;
    else if (nombre === "DESCRIPTION") actual.desc = valor;
    else if (nombre === "LOCATION") actual.location = valor;
    else if (nombre === "CATEGORIES") actual.categories = valor;
  }
}

function aISOUTC(dtRaw, dtParams) {
  // Formatos: 20260611T200000Z | 20260611T140000 | 20260611
  const m = dtRaw.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?(Z)?$/);
  if (!m) return null;
  const [, y, mo, d, h = "00", mi = "00", s = "00", z] = m;
  if (z) {
    // Ya es UTC
    return `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
  }
  // Sin Z: hora local Guatemala (UTC-6) -> sumamos 6h para obtener UTC
  const dt = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
  dt.setUTCHours(dt.getUTCHours() + 6);
  return dt.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function extraerEquipos(summary) {
  if (!summary) return null;
  // Quita prefijo "Grupo A:" / "Partido 3 -" / "Group A -"
  let texto = summary.replace(/^\s*(grupo|group|partido|match)\b[^:]*[:|-]\s*/i, "");
  const sep = texto.match(/\s+(?:vs?\.?|x|-|–|—|\u2013)\s+/i);
  if (!sep) return null;
  const idx = texto.indexOf(sep[0]);
  function limpiarNombre(s) {
  return s.replace(/^\s*[^\wÀ-ɏ]+/, '').replace(/^#?\d+\s*:\s*/, '').replace(/^\d+[°º]\s+/, '').trim();
}
  const local = limpiarNombre(texto.slice(0, idx));
  const visita = limpiarNombre(texto.slice(idx + sep[0].length));
  if (!local || !visita) return null;
  return { local, visita };
}

function extraerFaseGrupo(ev) {
  const fuente = `${ev.summary ?? ""} ${ev.categories ?? ""} ${ev.desc ?? ""}`;
  const grupo = fuente.match(/grupo\s+([A-L])|group\s+([A-L])/i);
  if (grupo) return { grupo: `Grupo ${(grupo[1] || grupo[2]).toUpperCase()}`, fase: null };
  if (/octavos|round of 16|16avos/i.test(fuente)) return { grupo: null, fase: "Octavos" };
  if (/cuartos|quarter/i.test(fuente)) return { grupo: null, fase: "Cuartos" };
  if (/semifinal|semi-final/i.test(fuente)) return { grupo: null, fase: "Semifinal" };
  if (/tercer puesto|third place/i.test(fuente)) return { grupo: null, fase: "3er puesto" };
  if (/final/i.test(fuente)) return { grupo: null, fase: "Final" };
  return { grupo: null, fase: null };
}

const esc = (s) => (s == null ? "NULL" : `'${String(s).replace(/'/g, "''")}'`);

const filas = [];
let id = 0;
let descartados = 0;
for (const ev of eventos) {
  const iso = aISOUTC(ev.dtRaw, ev.dtParams);
  const eq = extraerEquipos(ev.summary);
  if (!iso || !eq) {
    descartados++;
    continue;
  }
  id++;
  const { grupo, fase } = extraerFaseGrupo(ev);
  filas.push(
    `  (${id}, ${esc(eq.local)}, ${esc(eq.visita)}, '${iso}', ${esc(grupo)}, ${esc(fase)})`
  );
}

console.log("-- Generado por parse-ics.mjs");
console.log(`-- ${filas.length} partidos. ${descartados} eventos descartados.`);
console.log("delete from partidos;");
console.log(
  "insert into partidos (id, equipo_local, equipo_visitante, inicio, grupo, fase) values"
);
console.log(filas.join(",\n") + ";");

console.error(`✓ ${filas.length} partidos generados. ${descartados} descartados.`);
