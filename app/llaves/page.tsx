"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Partido, Pronostico } from "@/lib/types";
import { BRACKET, resolverEquipos, type BracketSlot } from "@/lib/bracket";

// ── Layout constants ─────────────────────────────────────────────────────────
const CARD_W  = 148;   // match card width (px)
const CARD_H  = 58;    // match card height (px)
const SLOT_H  = 80;    // base vertical slot per match in round 0 (doubles each round)
const H_GAP   = 44;    // horizontal gap between round columns (connector lines live here)
const COL_W   = CARD_W + H_GAP;
const LABEL_H = 28;    // round label strip height
const TOTAL_H = 16 * SLOT_H;            // 1280px — full bracket height
const TOTAL_W = 5 * CARD_W + 4 * H_GAP; // 916px  — full bracket width

// ── Bracket round configuration ─────────────────────────────────────────────
const ROUND_IDS = [
  ["D01","D02","D03","D04","D05","D06","D07","D08",
   "D09","D10","D11","D12","D13","D14","D15","D16"],
  ["O1","O2","O3","O4","O5","O6","O7","O8"],
  ["QF1","QF2","QF3","QF4"],
  ["SF1","SF2"],
  ["F1"],
] as const;

const ROUND_LABELS = ["Dieciseisavos","Octavos","Cuartos","Semifinal","Final"];

// ── Position helpers ─────────────────────────────────────────────────────────
function slotCY(round: number, pos: number): number {
  const h = SLOT_H * Math.pow(2, round);
  return h * pos + h / 2;
}
function colX(round: number): number { return round * COL_W; }

// ── Flags ────────────────────────────────────────────────────────────────────
const BANDERAS: Record<string, string> = {
  "Alemania":"🇩🇪","Arabia Saudita":"🇸🇦","Argelia":"🇩🇿","Argentina":"🇦🇷",
  "Australia":"🇦🇺","Austria":"🇦🇹","Bélgica":"🇧🇪","Bosnia y Herzegovina":"🇧🇦",
  "Brasil":"🇧🇷","Cabo Verde":"🇨🇻","Canadá":"🇨🇦","Colombia":"🇨🇴",
  "Corea del Sur":"🇰🇷","Costa de Marfil":"🇨🇮","Croacia":"🇭🇷","Curazao":"🇨🇼",
  "Ecuador":"🇪🇨","Egipto":"🇪🇬","España":"🇪🇸","Estados Unidos":"🇺🇸",
  "Francia":"🇫🇷","Ghana":"🇬🇭","Inglaterra":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","Irán":"🇮🇷",
  "Japón":"🇯🇵","Marruecos":"🇲🇦","México":"🇲🇽","Nigeria":"🇳🇬",
  "Noruega":"🇳🇴","Países Bajos":"🇳🇱","Paraguay":"🇵🇾","Portugal":"🇵🇹",
  "RD Congo":"🇨🇩","Senegal":"🇸🇳","Sudáfrica":"🇿🇦","Suecia":"🇸🇪",
  "Suiza":"🇨🇭","Turquía":"🇹🇷","Uruguay":"🇺🇾",
};
const fl = (e: string | null) => (e ? (BANDERAS[e] ?? "🏳️") : "");

// ── SVG connector lines ───────────────────────────────────────────────────────
function BracketLines() {
  const paths: string[] = [];
  ROUND_IDS.forEach((ids, rIdx) => {
    if (rIdx >= ROUND_IDS.length - 1) return;
    (ids as readonly string[]).forEach((_, pos) => {
      const x1   = colX(rIdx) + CARD_W;
      const y1   = slotCY(rIdx, pos);
      const x2   = colX(rIdx + 1);
      const y2   = slotCY(rIdx + 1, Math.floor(pos / 2));
      const midX = (x1 + x2) / 2;
      paths.push(`M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`);
    });
  });
  return (
    <>
      {paths.map((d, i) => (
        <path key={i} d={d} stroke="rgba(198,255,58,0.13)" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      ))}
    </>
  );
}

// ── Compact bracket match card ────────────────────────────────────────────────
function BracketCard({
  slot,
  pm,
  pronoClasificado,
  round,
  pos,
}: {
  slot: BracketSlot;
  pm: Map<number, Partido>;
  pronoClasificado: Map<number, string | null>;
  round: number;
  pos: number;
}) {
  const { local, visitante } = resolverEquipos(slot, pm);
  const partido  = slot.partidoId != null ? pm.get(slot.partidoId) ?? null : null;
  const ganador  = partido?.clasificado ?? null;
  const pick     = slot.partidoId != null ? pronoClasificado.get(slot.partidoId) ?? null : null;

  const isLocalW     = !!(ganador && ganador === local);
  const isVisitanteW = !!(ganador && ganador === visitante);

  const score =
    partido?.finalizado && partido.goles_local_final != null
      ? `${partido.goles_local_final}-${partido.goles_visitante_final ?? 0}`
      : null;

  const pickOk = partido?.finalizado && ganador && pick ? pick === ganador : null;
  const pickColor = pickOk === true ? "#c6ff3a" : pickOk === false ? "#ef4444" : null;

  const left = colX(round);
  const top  = slotCY(round, pos) - CARD_H / 2;

  return (
    <div
      style={{ position: "absolute", left, top, width: CARD_W, height: CARD_H }}
      className="flex flex-col overflow-hidden rounded-lg border border-cancha-600/30 bg-cancha-800"
    >
      {/* Local */}
      <div className={`flex flex-1 items-center gap-1.5 px-2 ${isVisitanteW ? "opacity-25" : ""}`}>
        <span className="text-sm leading-none shrink-0">{fl(local)}</span>
        <span className={`text-[11px] truncate leading-none ${isLocalW ? "font-bold text-crema" : "text-crema/60"}`}>
          {local ?? <span className="italic text-crema/25">Por det.</span>}
        </span>
      </div>

      {/* Divider — score badge floats on it */}
      <div className="relative flex-shrink-0">
        <div className="h-px bg-cancha-600/20" />
        {score && (
          <div className="absolute inset-x-0 -top-2.5 flex justify-center pointer-events-none">
            <span className="rounded bg-cancha-700 px-1 py-px font-mono text-[9px] text-crema/50 leading-none">
              {score}
            </span>
          </div>
        )}
      </div>

      {/* Visitante */}
      <div className={`flex flex-1 items-center gap-1.5 px-2 ${isLocalW ? "opacity-25" : ""}`}>
        <span className="text-sm leading-none shrink-0">{fl(visitante)}</span>
        <span className={`text-[11px] truncate leading-none ${isVisitanteW ? "font-bold text-crema" : "text-crema/60"}`}>
          {visitante ?? <span className="italic text-crema/25">Por det.</span>}
        </span>
      </div>

      {/* Pick indicator */}
      {pickColor && (
        <span
          className="absolute right-1.5 bottom-1 font-mono text-[10px] font-black"
          style={{ color: pickColor }}
        >
          {pickOk ? "✓" : "✗"}
        </span>
      )}
    </div>
  );
}

// ── Third-place card ─────────────────────────────────────────────────────────
function ThirdPlaceCard({
  slot,
  pm,
  pronoClasificado,
}: {
  slot: BracketSlot;
  pm: Map<number, Partido>;
  pronoClasificado: Map<number, string | null>;
}) {
  const partido  = slot.partidoId != null ? pm.get(slot.partidoId) ?? null : null;
  const { local, visitante } = resolverEquipos(slot, pm);
  const ganador  = partido?.clasificado ?? null;
  const pick     = slot.partidoId != null ? pronoClasificado.get(slot.partidoId) ?? null : null;
  const pickOk   = partido?.finalizado && ganador && pick ? pick === ganador : null;

  if (!partido) {
    return (
      <div className="rounded-xl border border-cancha-600/20 bg-cancha-800/40 px-5 py-4 text-center">
        <p className="text-sm text-crema/30">Se definirá tras las semifinales.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-cancha-600/30 bg-cancha-800">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-4">
        <div className={ganador && ganador !== local ? "opacity-30" : ""}>
          <div className="text-xl">{fl(local)}</div>
          <div className="text-sm font-semibold text-crema truncate">{local ?? "Por det."}</div>
        </div>
        <div className="text-center">
          {partido.finalizado && partido.goles_local_final != null ? (
            <span className="font-mono text-xl font-bold text-crema">
              {partido.goles_local_final}·{partido.goles_visitante_final ?? 0}
            </span>
          ) : (
            <span className="text-crema/30 text-sm">vs</span>
          )}
        </div>
        <div className={`text-right ${ganador && ganador !== visitante ? "opacity-30" : ""}`}>
          <div className="text-xl">{fl(visitante)}</div>
          <div className="text-sm font-semibold text-crema truncate">{visitante ?? "Por det."}</div>
        </div>
      </div>
      {pick && (
        <div className="border-t border-cancha-600/20 px-5 py-2 flex items-center gap-2">
          <span className="text-xs text-crema/40">Tu pick:</span>
          <span className="text-xs font-semibold text-crema/80">{fl(pick)} {pick}</span>
          {pickOk !== null && (
            <span className={`ml-auto font-black text-sm ${pickOk ? "text-lima" : "text-wc26-red"}`}>
              {pickOk ? "✓" : "✗"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Llaves() {
  const { session, cargando } = useAuth();
  const router = useRouter();

  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [pronos,   setPronos]   = useState<Pronostico[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!cargando && !session) router.replace("/");
  }, [cargando, session, router]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const knockoutIds = BRACKET.map((s) => s.partidoId).filter(Boolean) as number[];
      const [{ data: ps }, { data: prs }] = await Promise.all([
        supabase
          .from("partidos")
          .select("*")
          .in("fase", ["Dieciseisavos","Octavos","Cuartos","Semifinal","Tercero","Final"])
          .order("inicio", { ascending: true }),
        supabase
          .from("pronosticos")
          .select("partido_id, clasificado")
          .eq("usuario_id", session.user.id)
          .in("partido_id", knockoutIds.length ? knockoutIds : [-1]),
      ]);
      setPartidos((ps as Partido[]) ?? []);
      setPronos((prs as Pronostico[]) ?? []);
      setLoading(false);
    })();
  }, [session]);

  const pm = useMemo(() => {
    const m = new Map<number, Partido>();
    partidos.forEach((p) => m.set(p.id, p));
    return m;
  }, [partidos]);

  const pronoClasificado = useMemo(() => {
    const m = new Map<number, string | null>();
    pronos.forEach((pr) => m.set(pr.partido_id, pr.clasificado ?? null));
    return m;
  }, [pronos]);

  const slotMap = useMemo(() => {
    const m = new Map<string, BracketSlot>();
    BRACKET.forEach((s) => m.set(s.id, s));
    return m;
  }, []);

  const t1 = slotMap.get("T1")!;

  if (cargando || !session) return null;

  return (
    <div className="aparece">
      <h1 className="font-display mb-1 text-5xl text-lima uppercase">Llaves</h1>
      <p className="mb-5 text-sm text-crema/50">Cuadro eliminatorio · Mundial 2026</p>

      {loading ? (
        <p className="text-crema/40">Cargando llaves...</p>
      ) : (
        <>
          {/* ── Bracket organigrama ─────────────────────────────────────── */}
          <div className="overflow-x-auto rounded-xl border border-cancha-600/20 bg-cancha-900/50 p-4 pb-6">
            {/* Scroll hint on mobile */}
            <p className="mb-3 text-[10px] text-crema/25 text-right md:hidden">
              ← desliza para ver el cuadro →
            </p>

            <div style={{ width: TOTAL_W, minWidth: TOTAL_W }}>
              {/* Round labels */}
              <div className="flex" style={{ height: LABEL_H }}>
                {ROUND_LABELS.map((label, i) => (
                  <div
                    key={i}
                    style={{ width: i < 4 ? COL_W : CARD_W, flexShrink: 0 }}
                    className="flex items-center justify-center font-mono text-[9px] uppercase tracking-widest text-crema/30"
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Bracket area */}
              <div style={{ position: "relative", width: TOTAL_W, height: TOTAL_H }}>
                {/* Connector lines */}
                <svg
                  style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}
                  width={TOTAL_W}
                  height={TOTAL_H}
                >
                  <BracketLines />
                </svg>

                {/* Match cards */}
                {ROUND_IDS.map((ids, round) =>
                  (ids as readonly string[]).map((slotId, pos) => {
                    const slot = slotMap.get(slotId);
                    if (!slot) return null;
                    return (
                      <BracketCard
                        key={slotId}
                        slot={slot}
                        pm={pm}
                        pronoClasificado={pronoClasificado}
                        round={round}
                        pos={pos}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ── Tercer lugar ─────────────────────────────────────────────── */}
          <div className="mt-8">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-crema/40">
              3er Lugar
            </p>
            <div className="max-w-sm">
              <ThirdPlaceCard slot={t1} pm={pm} pronoClasificado={pronoClasificado} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
