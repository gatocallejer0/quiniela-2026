import type { Partido, Pronostico } from "./types";

// Multiplicador oficial por fase — se usa en el seed/migración para setear
// partidos.multiplicador al insertar cada ronda.
export const MULTIPLICADOR_POR_FASE: Record<string, number> = {
  "Dieciseisavos": 1,
  "Octavos":       2,
  "Cuartos":       3,
  "Semifinal":     4,
  "Final":         5,
};

export type DesglosePuntos = {
  marcador:        3 | 1 | 0;  // exacto / resultado / fallo (solo a 90 min)
  clasificadoBonus: 0 | 2;     // +2 si acierta el clasificado
  multiplicador:   number;
  total:           number;     // (marcador + clasificadoBonus) * multiplicador
};

/**
 * Calcula los puntos de un pronóstico para un partido.
 * - marcador y resultado se evalúan SOLO con goles_local_final / goles_visitante_final
 *   (= marcador a 90 min, incluso en eliminatorias).
 * - clasificadoBonus compara pr.clasificado con p.clasificado (equipo que avanzó real).
 * - Retorna null si el partido no está finalizado, no hay pronóstico, o faltan goles.
 */
export function calcularPuntos(
  partido: Partido,
  prono: Pronostico | undefined
): DesglosePuntos | null {
  if (!partido.finalizado || !prono || partido.goles_local_final == null) return null;

  const realLocal  = partido.goles_local_final;
  const realVisita = partido.goles_visitante_final ?? 0;

  let marcador: 3 | 1 | 0;
  if (prono.goles_local === realLocal && prono.goles_visitante === realVisita) {
    marcador = 3;
  } else if (
    Math.sign(prono.goles_local - prono.goles_visitante) ===
    Math.sign(realLocal - realVisita)
  ) {
    marcador = 1;
  } else {
    marcador = 0;
  }

  const clasificadoBonus: 0 | 2 =
    partido.clasificado != null &&
    prono.clasificado   != null &&
    prono.clasificado === partido.clasificado
      ? 2
      : 0;

  const multiplicador = partido.multiplicador ?? 1;

  return {
    marcador,
    clasificadoBonus,
    multiplicador,
    total: (marcador + clasificadoBonus) * multiplicador,
  };
}
