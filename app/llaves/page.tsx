"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Partido, Pronostico } from "@/lib/types";
import {
  BRACKET,
  FASES,
  FASE_LABEL,
  resolverEquipos,
  type BracketSlot,
  type Fase,
} from "@/lib/bracket";

const TZ = "America/Guatemala";

const BANDERAS: Record<string, string> = {
  "Alemania":"🇩🇪","Arabia Saudita":"🇸🇦","Argelia":"🇩🇿","Argentina":"🇦🇷",
  "Australia":"🇦🇺","Austria":"🇦🇹","Bélgica":"🇧🇪","Bosnia y Herzegovina":"🇧🇦",
  "Brasil":"🇧🇷","Cabo Verde":"🇨🇻","Canadá":"🇨🇦","Colombia":"🇨🇴",
  "Corea del Sur":"🇰🇷","Costa de Marfil":"🇨🇮","Croacia":"🇭🇷","Curazao":"🇨🇼",
  "Ecuador":"🇪🇨","Egipto":"🇪🇬","Escocia":"🏴󠁧󠁢󠁳󠁣󠁴󠁿","España":"🇪🇸","Estados Unidos":"🇺🇸",
  "Francia":"🇫🇷","Ghana":"🇬🇭","Haití":"🇭🇹","Inglaterra":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","Irán":"🇮🇷",
  "Irak":"🇮🇶","Japón":"🇯🇵","Jordania":"🇯🇴","Marruecos":"🇲🇦","México":"🇲🇽",
  "Nigeria":"🇳🇬","Noruega":"🇳🇴","Nueva Zelanda":"🇳🇿","Países Bajos":"🇳🇱",
  "Panamá":"🇵🇦","Paraguay":"🇵🇾","Portugal":"🇵🇹","Qatar":"🇶🇦","RD Congo":"🇨🇩",
  "República Checa":"🇨🇿","Senegal":"🇸🇳","Sudáfrica":"🇿🇦","Suecia":"🇸🇪",
  "Suiza":"🇨🇭","Túnez":"🇹🇳","Turquía":"🇹🇷","Uruguay":"🇺🇾","Uzbekistán":"🇺🇿",
};
const fl = (e: string | null) => (e ? (BANDERAS[e] ?? "🏳️") : "");

function fmtFecha(iso: string): string {
  return new Intl.DateTimeFormat("es-GT", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// ── Tarjeta de un cruce ────────────────────────────────────────────────────
function TarjetaCruce({
  slot,
  pm,
  pronoClasificado,
  currentUid,
}: {
  slot: BracketSlot;
  pm: Map<number, Partido>;
  pronoClasificado: Map<number, string | null>;
  currentUid: string;
}) {
  const partido = slot.partidoId != null ? pm.get(slot.partidoId) ?? null : null;
  const { local, visitante } = resolverEquipos(slot, pm);

  const ahora = Date.now();
  const cierreMs = partido ? new Date(partido.inicio).getTime() - 10 * 60 * 1000 : null;
  const enCurso  = partido && !partido.finalizado && new Date(partido.inicio).getTime() <= ahora;
  const pronto   = partido && !partido.finalizado && cierreMs && cierreMs <= ahora && !enCurso;

  const ganador = partido?.clasificado ?? null;
  const pick    = slot.partidoId != null ? (pronoClasificado.get(slot.partidoId) ?? null) : null;

  // Status badge
  let statusLabel: string;
  let statusColor: string;
  if (!partido) {
    statusLabel = "Por jugar";
    statusColor = "text-crema/30";
  } else if (partido.finalizado) {
    statusLabel = "Finalizado";
    statusColor = "text-lima/70";
  } else if (enCurso) {
    statusLabel = "En curso";
    statusColor = "text-wc26-red";
  } else {
    statusLabel = fmtFecha(partido.inicio);
    statusColor = "text-crema/40";
  }

  // Pick correctness
  let pickIcon: string | null = null;
  if (partido?.finalizado && ganador && pick) {
    pickIcon = pick === ganador ? "✓" : "✗";
  }

  const esLocal    = ganador && ganador === local;
  const esVisitante = ganador && ganador === visitante;

  return (
    <div className="overflow-hidden rounded-xl border border-cancha-600/30 bg-cancha-800 transition hover:-translate-y-0.5 hover:shadow-card-hover">
      {/* Cabecera */}
      <div className="flex items-center justify-between bg-cancha-700/40 px-4 py-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-crema/40">
          {slot.id}
        </span>
        <span
          className={`flex items-center gap-1 text-xs font-semibold ${statusColor}`}
        >
          {enCurso && (
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-wc26-red" />
          )}
          {statusLabel}
        </span>
      </div>

      {/* Equipos + marcador */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-5">
        {/* Local */}
        <div className={`flex flex-col gap-0.5 ${esLocal ? "" : ganador ? "opacity-40" : ""}`}>
          <span className="text-2xl leading-none">{fl(local)}</span>
          <span
            className={`text-sm leading-snug ${
              esLocal ? "font-bold text-crema" : "font-medium text-crema/70"
            }`}
          >
            {local ?? <span className="italic text-crema/30">Por det.</span>}
          </span>
          {esLocal && (
            <span className="text-[10px] font-bold text-lima">↑ clasifica</span>
          )}
        </div>

        {/* Centro: marcador o separador */}
        <div className="flex flex-col items-center gap-1 text-center">
          {partido?.finalizado && partido.goles_local_final != null ? (
            <span className="font-mono text-2xl font-bold text-crema tabular">
              {partido.goles_local_final}
              <span className="mx-1 text-cancha-600">·</span>
              {partido.goles_visitante_final}
            </span>
          ) : partido && !partido.finalizado ? (
            <span className="text-base font-semibold text-crema/30">vs</span>
          ) : (
            <span className="text-xs text-crema/20">vs</span>
          )}
          <span className="text-[9px] uppercase tracking-widest text-crema/20">
            {slot.fase === "Dieciseisavos" ? "90 min" : ""}
          </span>
        </div>

        {/* Visitante */}
        <div
          className={`flex flex-col items-end gap-0.5 text-right ${
            esVisitante ? "" : ganador ? "opacity-40" : ""
          }`}
        >
          <span className="text-2xl leading-none">{fl(visitante)}</span>
          <span
            className={`text-sm leading-snug ${
              esVisitante ? "font-bold text-crema" : "font-medium text-crema/70"
            }`}
          >
            {visitante ?? <span className="italic text-crema/30">Por det.</span>}
          </span>
          {esVisitante && (
            <span className="text-[10px] font-bold text-lima">↑ clasifica</span>
          )}
        </div>
      </div>

      {/* Badge de pick del usuario (PASO 5) */}
      {slot.partidoId != null && (
        <div className="border-t border-cancha-600/20 px-4 py-2.5">
          {pick ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-crema/40">Tu pick:</span>
              <span className="text-xs font-semibold text-crema/80">
                {fl(pick)} {pick}
              </span>
              {pickIcon && (
                <span
                  className={`ml-auto text-sm font-black ${
                    pickIcon === "✓" ? "text-lima" : "text-wc26-red"
                  }`}
                >
                  {pickIcon}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-crema/25 italic">Sin pronóstico</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────
export default function Llaves() {
  const { session, cargando } = useAuth();
  const router = useRouter();

  const [partidos,  setPartidos]  = useState<Partido[]>([]);
  const [pronos,    setPronos]    = useState<Pronostico[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [faseActiva, setFaseActiva] = useState<Fase>("Dieciseisavos");

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
          .in("fase", ["Dieciseisavos", "Octavos", "Cuartos", "Semifinal", "Tercero", "Final"])
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

  const slotsDeFase = useMemo(
    () => BRACKET.filter((s) => s.fase === faseActiva),
    [faseActiva]
  );

  if (cargando || !session) return null;

  return (
    <div className="aparece">
      <h1 className="font-display mb-1 text-5xl text-lima uppercase">Llaves</h1>
      <p className="mb-5 text-sm text-crema/50">
        Cuadro eliminatorio · Mundial 2026
      </p>

      {/* Tabs de ronda */}
      <div className="mb-6 -mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto">
        <div className="flex gap-2 pb-1 min-w-max">
          {FASES.map((fase) => {
            const activo = fase === faseActiva;
            // ¿Hay algún slot de esta fase con partido ya en BD?
            const tienePartidos = BRACKET.filter((s) => s.fase === fase).some(
              (s) => s.partidoId != null && pm.has(s.partidoId)
            );
            return (
              <button
                key={fase}
                onClick={() => setFaseActiva(fase)}
                className={`relative rounded-full px-5 py-2 text-sm font-bold transition ${
                  activo
                    ? "bg-lima text-carbon shadow-md"
                    : "bg-cancha-700/60 text-crema/50 hover:text-crema"
                }`}
              >
                {FASE_LABEL[fase]}
                {tienePartidos && !activo && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-lima" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido de la ronda activa */}
      {loading ? (
        <p className="text-crema/40">Cargando llaves...</p>
      ) : (
        <>
          {/* Encabezado de ronda */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-crema/70">{faseActiva}</h2>
            <span className="text-xs text-crema/30">
              {slotsDeFase.filter((s) => s.partidoId != null && pm.get(s.partidoId)?.finalizado).length}
              {" / "}
              {slotsDeFase.length} jugados
            </span>
          </div>

          {/* Lista de cruces */}
          <div className="grid gap-3 sm:grid-cols-2">
            {slotsDeFase.map((slot) => (
              <TarjetaCruce
                key={slot.id}
                slot={slot}
                pm={pm}
                pronoClasificado={pronoClasificado}
                currentUid={session.user.id}
              />
            ))}
          </div>

          {/* Nota si no hay partidos en esta fase */}
          {slotsDeFase.every((s) => s.partidoId == null || !pm.has(s.partidoId)) && (
            <div className="mt-6 rounded-xl border border-cancha-600/20 bg-cancha-800/40 px-6 py-8 text-center">
              <p className="text-2xl mb-2">🏆</p>
              <p className="text-sm text-crema/40">
                Los partidos de {faseActiva} se definirán cuando avancen los equipos.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
