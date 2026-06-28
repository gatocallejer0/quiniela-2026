// ═══════════════════════════════════════════════════════════════════════════
//  lib/bracket.ts — Topología del cuadro eliminatorio Mundial 2026
//
//  CÓMO EDITAR:
//  1. Los partidoId de Dieciseisavos (73-88) ya están en la BD.
//     Reordénalos aquí para que D01-D16 coincidan con el cuadro oficial.
//  2. Cuando el admin cree los partidos de Octavos en la BD, pon sus IDs
//     en los slots O1-O8. Igual para rondas posteriores.
//  3. alimentaA y posicion definen la propagación de ganadores — no los toques
//     a menos que el fixture del torneo cambie.
// ═══════════════════════════════════════════════════════════════════════════

import type { Partido } from "./types";

export type Fase      = "Dieciseisavos" | "Octavos" | "Cuartos" | "Semifinal" | "Final";
export type Posicion  = "local" | "visitante";

export interface BracketSlot {
  id:        string;
  fase:      Fase;
  /** FK a partidos.id. null = partido aún sin crear en la BD. */
  partidoId: number | null;
  /** Slot de la ronda siguiente que recibe al ganador. null = campeón. */
  alimentaA: string | null;
  /** Posición en el partido de la ronda siguiente. */
  posicion:  Posicion | null;
}

// Orden de los tabs en la UI
export const FASES: Fase[] = ["Dieciseisavos", "Octavos", "Cuartos", "Semifinal", "Final"];

export const FASE_LABEL: Record<Fase, string> = {
  Dieciseisavos: "16vos",
  Octavos:       "8vos",
  Cuartos:       "4tos",
  Semifinal:     "Semis",
  Final:         "Final",
};

// ─────────────────────────────────────────────────────────────────────────────
//  TOPOLOGÍA — ajusta los partidoId según el cuadro real
// ─────────────────────────────────────────────────────────────────────────────
export const BRACKET: BracketSlot[] = [

  // ── DIECISEISAVOS ─────────────────────────────────────────────────────────
  { id: "D01", fase: "Dieciseisavos", partidoId: 73, alimentaA: "O1", posicion: "local"      },
  { id: "D02", fase: "Dieciseisavos", partidoId: 74, alimentaA: "O1", posicion: "visitante"  },
  { id: "D03", fase: "Dieciseisavos", partidoId: 75, alimentaA: "O2", posicion: "local"      },
  { id: "D04", fase: "Dieciseisavos", partidoId: 76, alimentaA: "O2", posicion: "visitante"  },
  { id: "D05", fase: "Dieciseisavos", partidoId: 77, alimentaA: "O3", posicion: "local"      },
  { id: "D06", fase: "Dieciseisavos", partidoId: 78, alimentaA: "O3", posicion: "visitante"  },
  { id: "D07", fase: "Dieciseisavos", partidoId: 79, alimentaA: "O4", posicion: "local"      },
  { id: "D08", fase: "Dieciseisavos", partidoId: 80, alimentaA: "O4", posicion: "visitante"  },
  { id: "D09", fase: "Dieciseisavos", partidoId: 81, alimentaA: "O5", posicion: "local"      },
  { id: "D10", fase: "Dieciseisavos", partidoId: 82, alimentaA: "O5", posicion: "visitante"  },
  { id: "D11", fase: "Dieciseisavos", partidoId: 83, alimentaA: "O6", posicion: "local"      },
  { id: "D12", fase: "Dieciseisavos", partidoId: 84, alimentaA: "O6", posicion: "visitante"  },
  { id: "D13", fase: "Dieciseisavos", partidoId: 85, alimentaA: "O7", posicion: "local"      },
  { id: "D14", fase: "Dieciseisavos", partidoId: 86, alimentaA: "O7", posicion: "visitante"  },
  { id: "D15", fase: "Dieciseisavos", partidoId: 87, alimentaA: "O8", posicion: "local"      },
  { id: "D16", fase: "Dieciseisavos", partidoId: 88, alimentaA: "O8", posicion: "visitante"  },

  // ── OCTAVOS ───────────────────────────────────────────────────────────────
  { id: "O1",  fase: "Octavos",  partidoId: null, alimentaA: "QF1", posicion: "local"     },
  { id: "O2",  fase: "Octavos",  partidoId: null, alimentaA: "QF1", posicion: "visitante" },
  { id: "O3",  fase: "Octavos",  partidoId: null, alimentaA: "QF2", posicion: "local"     },
  { id: "O4",  fase: "Octavos",  partidoId: null, alimentaA: "QF2", posicion: "visitante" },
  { id: "O5",  fase: "Octavos",  partidoId: null, alimentaA: "QF3", posicion: "local"     },
  { id: "O6",  fase: "Octavos",  partidoId: null, alimentaA: "QF3", posicion: "visitante" },
  { id: "O7",  fase: "Octavos",  partidoId: null, alimentaA: "QF4", posicion: "local"     },
  { id: "O8",  fase: "Octavos",  partidoId: null, alimentaA: "QF4", posicion: "visitante" },

  // ── CUARTOS DE FINAL ──────────────────────────────────────────────────────
  { id: "QF1", fase: "Cuartos",  partidoId: null, alimentaA: "SF1", posicion: "local"     },
  { id: "QF2", fase: "Cuartos",  partidoId: null, alimentaA: "SF1", posicion: "visitante" },
  { id: "QF3", fase: "Cuartos",  partidoId: null, alimentaA: "SF2", posicion: "local"     },
  { id: "QF4", fase: "Cuartos",  partidoId: null, alimentaA: "SF2", posicion: "visitante" },

  // ── SEMIFINALES ───────────────────────────────────────────────────────────
  { id: "SF1", fase: "Semifinal", partidoId: null, alimentaA: "F1", posicion: "local"     },
  { id: "SF2", fase: "Semifinal", partidoId: null, alimentaA: "F1", posicion: "visitante" },

  // ── FINAL ─────────────────────────────────────────────────────────────────
  { id: "F1",  fase: "Final",     partidoId: null, alimentaA: null, posicion: null        },
];

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers de propagación
// ─────────────────────────────────────────────────────────────────────────────

/** Devuelve el clasificado del slot (quién ganó ese partido). */
function ganadorDe(slotId: string, pm: Map<number, Partido>): string | null {
  const slot = BRACKET.find((s) => s.id === slotId);
  if (!slot || slot.partidoId == null) return null;
  return pm.get(slot.partidoId)?.clasificado ?? null;
}

/**
 * Resuelve los nombres de equipos para un slot:
 * 1. Si tiene partidoId en BD → usa equipo_local / equipo_visitante del partido.
 * 2. Si no tiene partidoId → propaga los ganadores de los slots que alimentan a este.
 * El resultado es null cuando todavía no se conoce el equipo.
 */
export function resolverEquipos(
  slot: BracketSlot,
  pm: Map<number, Partido>
): { local: string | null; visitante: string | null } {
  if (slot.partidoId != null) {
    const p = pm.get(slot.partidoId);
    if (p) return { local: p.equipo_local, visitante: p.equipo_visitante };
  }
  const fl = BRACKET.find((s) => s.alimentaA === slot.id && s.posicion === "local");
  const fv = BRACKET.find((s) => s.alimentaA === slot.id && s.posicion === "visitante");
  return {
    local:     fl ? ganadorDe(fl.id, pm) : null,
    visitante: fv ? ganadorDe(fv.id, pm) : null,
  };
}
