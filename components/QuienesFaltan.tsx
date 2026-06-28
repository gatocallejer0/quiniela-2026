"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

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
const fl = (e: string) => BANDERAS[e] ?? "";

type PartidoRow = {
  id: number;
  equipo_local: string;
  equipo_visitante: string;
  inicio: string;
  fase: string | null;
  grupo: string | null;
};

type Perfil = { id: string; nombre: string };

type PartidoConEstado = PartidoRow & {
  listos: string[];   // usuario_ids que sí pronosticaron
  faltan: Perfil[];   // perfiles que faltan
};

// Formatea la hora del partido en zona GT de forma amigable
function fmtFecha(iso: string): string {
  const d = new Date(iso);
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("es-GT", { timeZone: TZ, ...opts }).format(d);

  const diaPartido = fmt({ year: "numeric", month: "2-digit", day: "2-digit" });
  const diahoy     = fmt({ year: "numeric", month: "2-digit", day: "2-digit" });
  const diamanana  = new Intl.DateTimeFormat("es-GT", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(Date.now() + 86_400_000));
  const hora = fmt({ hour: "2-digit", minute: "2-digit" });

  if (diaPartido === diahoy)    return `Hoy · ${hora}`;
  if (diaPartido === diamanana) return `Mañana · ${hora}`;
  return fmt({ weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const VISTA_INICIAL = 3; // partidos visibles sin expandir

export function QuienesFaltan() {
  const { session, cargando } = useAuth();
  const [partidos,   setPartidos]   = useState<PartidoConEstado[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [expandido,  setExpandido]  = useState(false);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const [{ data: ps }, { data: prs }, { data: pfs }] = await Promise.all([
        supabase
          .from("partidos")
          .select("id, equipo_local, equipo_visitante, inicio, fase, grupo")
          .eq("finalizado", false)
          .gt("inicio", new Date().toISOString())
          .order("inicio", { ascending: true }),
        // SECURITY DEFINER: devuelve solo (partido_id, usuario_id), sin contenido
        supabase.rpc("quien_ya_pronostico_proximos"),
        supabase.from("perfiles").select("id, nombre").order("nombre"),
      ]);

      const perfiles = (pfs ?? []) as Perfil[];
      const pronoMap: Record<number, Set<string>> = {};
      ((prs ?? []) as { partido_id: number; usuario_id: string }[]).forEach(({ partido_id, usuario_id }) => {
        if (!pronoMap[partido_id]) pronoMap[partido_id] = new Set();
        pronoMap[partido_id].add(usuario_id);
      });

      const conEstado: PartidoConEstado[] = ((ps ?? []) as PartidoRow[]).map((p) => {
        const listos = Array.from(pronoMap[p.id] ?? []);
        const listoSet = new Set(listos);
        const faltan = perfiles.filter((pf) => !listoSet.has(pf.id));
        return { ...p, listos, faltan };
      });

      setPartidos(conEstado);
      setLoading(false);
    })();
  }, [session]);

  if (cargando || !session || loading) return null;
  if (partidos.length === 0) return null;

  const totalParticipantes = new Set(
    partidos.flatMap((p) => [...p.listos, ...p.faltan.map((f) => f.id)])
  ).size;

  // Cuántas personas únicas faltan en al menos 1 partido
  const usuariosFaltan = new Set(partidos.flatMap((p) => p.faltan.map((f) => f.id)));
  const nFaltan = usuariosFaltan.size;

  const visibles = expandido ? partidos : partidos.slice(0, VISTA_INICIAL);
  const hayMas   = partidos.length > VISTA_INICIAL;

  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-cancha-600/30 bg-cancha-800">
      {/* Cabecera */}
      <div className="border-b border-cancha-600/30 px-6 py-4">
        <span className="block font-mono text-[11px] uppercase tracking-widest text-crema/40">
          Quiénes faltan
        </span>
        <p className="mt-0.5 text-sm text-crema/70">
          {nFaltan === 0 ? (
            <span className="font-semibold text-lima">
              ✅ ¡Todos van al día! La familia está lista.
            </span>
          ) : (
            <>
              <span className="font-semibold text-amber-400">
                {nFaltan} {nFaltan === 1 ? "persona falta" : "personas faltan"}
              </span>{" "}
              por completar al menos un pronóstico próximo.
            </>
          )}
        </p>
      </div>

      {/* Lista de partidos */}
      <ul className="divide-y divide-cancha-600/20">
        {visibles.map((p) => {
          const nListos = p.listos.length;
          const nTotal  = totalParticipantes;
          const todosListos = p.faltan.length === 0;
          const pct = nTotal > 0 ? Math.round((nListos / nTotal) * 100) : 100;

          return (
            <li key={p.id} className="px-5 py-4">
              {/* Partido + meta */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-crema leading-snug">
                    <span>{fl(p.equipo_local)}</span>
                    <span className="truncate">{p.equipo_local}</span>
                    <span className="text-crema/30">vs</span>
                    <span className="truncate">{p.equipo_visitante}</span>
                    <span>{fl(p.equipo_visitante)}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-crema/40">
                    <span>{fmtFecha(p.inicio)}</span>
                    {(p.fase ?? p.grupo) && (
                      <>
                        <span>·</span>
                        <span className="rounded bg-cancha-600/50 px-1.5 py-px font-mono">
                          {p.fase ?? p.grupo}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Contador X/Y */}
                <div className="shrink-0 text-right">
                  <span className={`font-mono text-base font-bold tabular ${todosListos ? "text-lima" : "text-crema/70"}`}>
                    {nListos}/{nTotal}
                  </span>
                  <span className="block text-[10px] text-crema/30">listos</span>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-cancha-700">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: todosListos ? "#c6ff3a" : pct >= 80 ? "#fbbf24" : "#60a5fa",
                  }}
                />
              </div>

              {/* Chips de quienes faltan */}
              {todosListos ? (
                <p className="mt-2 text-xs text-lima/70">✅ Todos listos para este partido</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.faltan.slice(0, 6).map((pf) => (
                    <span
                      key={pf.id}
                      className="rounded-full bg-cancha-700 px-2.5 py-0.5 text-xs text-crema/50"
                    >
                      {pf.nombre.split(" ")[0]}
                    </span>
                  ))}
                  {p.faltan.length > 6 && (
                    <span className="rounded-full bg-cancha-700 px-2.5 py-0.5 text-xs text-crema/30">
                      +{p.faltan.length - 6} más
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Botón ver más / menos */}
      {hayMas && (
        <button
          onClick={() => setExpandido((v) => !v)}
          className="flex w-full items-center justify-center gap-1 border-t border-cancha-600/30 py-3 text-xs font-semibold text-crema/40 transition hover:text-crema/70"
        >
          {expandido
            ? "Ver menos"
            : `Ver ${partidos.length - VISTA_INICIAL} partidos más`}
          <span
            className="material-symbols-outlined text-sm transition-transform duration-200"
            style={{ transform: expandido ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            expand_more
          </span>
        </button>
      )}
    </div>
  );
}
