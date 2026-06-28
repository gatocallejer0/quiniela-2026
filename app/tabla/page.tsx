"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { FilaTabla, Partido, Pronostico, PuntosAdicional } from "@/lib/types";
import { calcularPuntos } from "@/lib/scoring";

// Colores para los otros jugadores (el usuario siempre es lima)
const COLORES = [
  "#60a5fa", // blue-400
  "#f87171", // red-400
  "#fb923c", // orange-400
  "#a78bfa", // violet-400
  "#34d399", // emerald-400
  "#f472b6", // pink-400
  "#facc15", // yellow-400
  "#38bdf8", // sky-400
  "#4ade80", // green-400
  "#e879f9", // fuchsia-400
];

type SerieJugador = {
  usuarioId: string;
  nombre: string;
  puntos: number[]; // acumulado por partido finalizado (index 0 = inicio = 0)
};

export default function Tabla() {
  const { session, perfil, cargando } = useAuth();
  const router = useRouter();
  const [filas, setFilas] = useState<FilaTabla[]>([]);
  const [filasAd, setFilasAd] = useState<(PuntosAdicional & { nombre: string })[]>([]);
  const [series, setSeries] = useState<SerieJugador[]>([]);
  const [cargandoData, setCargandoData] = useState(true);

  useEffect(() => {
    if (!cargando && !session) router.replace("/");
  }, [cargando, session, router]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const [
          { data: tabla },
          { data: pts },
          { data: perfs },
          { data: psFin },
          { data: todosLosPros },
        ] = await Promise.all([
          supabase.from("vista_tabla").select("*").order("puntos", { ascending: false }),
          supabase.from("puntos_adicionales").select("*"),
          supabase.from("perfiles").select("id, nombre"),
          supabase.from("partidos").select("*").eq("finalizado", true).order("inicio", { ascending: true }),
          supabase.from("pronosticos").select("*"),
        ]);

        setFilas((tabla as FilaTabla[]) ?? []);

        const nombreMap: Record<string, string> = {};
        (perfs as { id: string; nombre: string }[] | null)?.forEach(
          (p) => { nombreMap[p.id] = p.nombre; }
        );
        const adOrdenado = ((pts as PuntosAdicional[] | null) ?? [])
          .map((p) => ({ ...p, nombre: nombreMap[p.usuario_id] ?? "?" }))
          .sort((a, b) => b.puntos - a.puntos);
        setFilasAd(adOrdenado);

        // Construir series de puntos acumulados por jugador
        const partidos = (psFin as Partido[] | null) ?? [];
        const pronos = (todosLosPros as Pronostico[] | null) ?? [];

        // Agrupar pronósticos por usuario_id → partido_id
        const pronosPorUser: Record<string, Record<number, Pronostico>> = {};
        for (const pr of pronos) {
          if (!pronosPorUser[pr.usuario_id]) pronosPorUser[pr.usuario_id] = {};
          pronosPorUser[pr.usuario_id][pr.partido_id] = pr;
        }

        const usuarios = Object.keys(pronosPorUser);
        const seriesCalc: SerieJugador[] = usuarios.map((uid) => {
          let acum = 0;
          const puntosSerie = [0];
          for (const p of partidos) {
            const d = calcularPuntos(p, pronosPorUser[uid][p.id]);
            if (!d) continue;
            acum += d.total;
            puntosSerie.push(acum);
          }
          return {
            usuarioId: uid,
            nombre: nombreMap[uid] ?? "?",
            puntos: puntosSerie,
          };
        });

        // Ordenar: el usuario actual al final (encima en SVG)
        seriesCalc.sort((a, b) =>
          a.usuarioId === session.user.id ? 1 :
          b.usuarioId === session.user.id ? -1 : 0
        );

        setSeries(seriesCalc);
      } catch (_) {
      } finally {
        setCargandoData(false);
      }
    })();
  }, [session]);

  if (cargando || !session) return null;

  const posicionChip = (i: number) => {
    if (i === 0) return (
      <div className="flex w-10 shrink-0 flex-col items-center">
        <span className="text-2xl leading-none">🥇</span>
        <span className="text-[10px] font-black text-wc26-gold">1</span>
      </div>
    );
    if (i === 1) return (
      <div className="flex w-10 shrink-0 flex-col items-center">
        <span className="text-2xl leading-none">🥈</span>
        <span className="text-[10px] font-black text-wc26-blue">2</span>
      </div>
    );
    if (i === 2) return (
      <div className="flex w-10 shrink-0 flex-col items-center">
        <span className="text-2xl leading-none">🥉</span>
        <span className="text-[10px] font-black text-wc26-green">3</span>
      </div>
    );
    return (
      <div className="flex w-10 shrink-0 flex-col items-center">
        <span className="text-2xl leading-none">⚽</span>
        <span className="text-[10px] font-semibold text-crema/40">{i + 1}</span>
      </div>
    );
  };

  return (
    <div className="aparece">
      <h1 className="font-display mb-1 text-5xl text-lima uppercase">Tabla</h1>
      <p className="mb-6 text-sm text-crema/50">Posiciones de la familia.</p>

      {cargandoData ? (
        <p className="text-crema/40">Cargando...</p>
      ) : (
        <>
          {/* Gráfica de carrera — visible para todos */}
          {series.length >= 1 && series.some((s) => s.puntos.length >= 2) && (
            <div className="mb-8 overflow-hidden rounded-xl border border-cancha-600/30 bg-cancha-800">
              <div className="flex items-center justify-between px-6 pt-5 pb-4">
                <div>
                  <span className="block text-xs font-mono uppercase tracking-widest text-crema/40">
                    Carrera de puntos
                  </span>
                  <span className="text-sm text-crema/60">
                    Partido a partido &mdash; tú en verde
                  </span>
                </div>
                <span className="font-mono text-2xl font-bold text-lima tabular">
                  {series.find((s) => s.usuarioId === session.user.id)?.puntos.slice(-1)[0] ?? 0} pts
                </span>
              </div>
              <GraficaCarrera series={series} usuarioId={session.user.id} />
              <div className="flex justify-between px-6 pb-4 pt-1">
                <span className="text-xs text-crema/30">Jornada 1</span>
                <span className="text-xs text-crema/30">
                  Jornada{" "}
                  {Math.max(...series.map((s) => s.puntos.length - 1))}
                </span>
              </div>
            </div>
          )}

          {/* Posiciones */}
          <div className="overflow-hidden rounded-xl border border-cancha-600/30 bg-cancha-800 shadow-carta">
            {filas.map((f, i) => (
              <div
                key={f.usuario_id}
                className={`flex items-center justify-between px-6 py-4 hover:bg-cancha-700/50 transition-colors ${
                  i !== filas.length - 1 ? "border-b border-cancha-600/30" : ""
                } ${f.usuario_id === session.user.id ? "bg-lima/5" : ""}`}
              >
                <div className="flex items-center gap-4">
                  {posicionChip(i)}
                  <div>
                    <span className="text-base font-semibold text-crema">
                      {f.nombre}
                      {f.usuario_id === session.user.id && (
                        <span className="ml-2 text-xs font-bold text-lima/70">(tú)</span>
                      )}
                    </span>
                    {f.pagado && (
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-lima/70">
                        <span
                          className="material-symbols-outlined text-xs"
                          style={{ fontVariationSettings: "'FILL' 1", fontSize: 12 }}
                        >
                          check_circle
                        </span>
                        Pagado
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-crema/40">{f.jugados} jug.</span>
                  <span className="font-mono text-3xl font-bold text-lima tabular">{f.puntos}</span>
                </div>
              </div>
            ))}
            {filas.length === 0 && (
              <p className="px-6 py-8 text-center text-crema/40">
                Todavia sin participantes.
              </p>
            )}
          </div>

          {/* Puntos adicionales */}
          {filasAd.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display mb-1 text-5xl text-lima uppercase">Premios adicionales</h2>
              <p className="mb-6 text-sm text-crema/50">Puntos por actividades extra.</p>
              <div className="overflow-hidden rounded-xl border border-cancha-600/30 bg-cancha-800 shadow-carta">
                {filasAd.map((f, i) => (
                  <div
                    key={f.usuario_id}
                    className={`flex items-center justify-between px-6 py-4 hover:bg-cancha-700/50 transition-colors ${
                      i !== filasAd.length - 1 ? "border-b border-cancha-600/30" : ""
                    } ${f.usuario_id === session.user.id ? "bg-lima/5" : ""}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex w-10 shrink-0 flex-col items-center">
                        <span className="text-2xl leading-none">
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "⭐"}
                        </span>
                        <span className="text-[10px] font-semibold text-crema/40">{i + 1}</span>
                      </div>
                      <span className="text-base font-semibold text-crema">
                        {f.nombre}
                        {f.usuario_id === session.user.id && (
                          <span className="ml-2 text-xs font-bold text-lima/70">(tú)</span>
                        )}
                      </span>
                    </div>
                    <span className="font-mono text-3xl font-bold text-lima tabular">{f.puntos}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GraficaCarrera({
  series,
  usuarioId,
}: {
  series: SerieJugador[];
  usuarioId: string;
}) {
  const W = 700;
  const H = 180;
  const padL = 12;
  const padR = 110; // espacio para etiquetas de nombre
  const padT = 16;
  const padB = 12;

  const maxN = Math.max(...series.map((s) => s.puntos.length - 1), 1);
  const maxV = Math.max(...series.flatMap((s) => s.puntos), 1);

  const cx = (i: number) => padL + (i / maxN) * (W - padL - padR);
  const cy = (v: number) => padT + (1 - v / maxV) * (H - padT - padB);

  // Líneas de referencia horizontales
  const gridYs = [0.25, 0.5, 0.75, 1].map((f) => ({ v: Math.round(maxV * f), y: cy(maxV * f) }));

  // Asignar color a cada jugador
  let colorIdx = 0;
  const colorMap: Record<string, string> = {};
  for (const s of series) {
    if (s.usuarioId === usuarioId) {
      colorMap[s.usuarioId] = "#c6ff3a"; // lima
    } else {
      colorMap[s.usuarioId] = COLORES[colorIdx % COLORES.length];
      colorIdx++;
    }
  }

  // Ordenar series para el render de etiquetas (por puntos finales desc)
  const ordenadas = [...series].sort(
    (a, b) => (b.puntos.at(-1) ?? 0) - (a.puntos.at(-1) ?? 0)
  );

  // Evitar solapamiento de etiquetas: si dos finales están muy cerca, separar
  const etiquetas: { s: SerieJugador; y: number; color: string }[] = [];
  for (const s of ordenadas) {
    const rawY = cy(s.puntos.at(-1) ?? 0);
    let finalY = rawY;
    for (const prev of etiquetas) {
      if (Math.abs(prev.y - finalY) < 14) {
        finalY = prev.y + 14;
      }
    }
    etiquetas.push({ s, y: finalY, color: colorMap[s.usuarioId] });
  }

  const smoothPath = (puntos: number[]) => {
    if (puntos.length < 2) return "";
    let d = `M ${cx(0)},${cy(puntos[0])}`;
    for (let i = 1; i < puntos.length; i++) {
      const x0 = cx(i - 1), y0 = cy(puntos[i - 1]);
      const x1 = cx(i), y1 = cy(puntos[i]);
      const cpx = (x0 + x1) / 2;
      d += ` C ${cpx},${y0} ${cpx},${y1} ${x1},${y1}`;
    }
    return d;
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full"
      style={{ height: 200 }}
    >
      {/* Grid lines */}
      {gridYs.map(({ v, y }) => (
        <g key={v}>
          <line
            x1={padL} y1={y} x2={W - padR} y2={y}
            stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1"
          />
          <text x={padL + 2} y={y - 3} fontSize="8" fill="rgba(255,255,255,0.2)" fontFamily="monospace">
            {v}
          </text>
        </g>
      ))}

      {/* Líneas de todos los jugadores (primero los otros, luego el usuario encima) */}
      {series.map((s) => {
        const color = colorMap[s.usuarioId];
        const esTu = s.usuarioId === usuarioId;
        const path = smoothPath(s.puntos);
        if (!path) return null;

        return (
          <g key={s.usuarioId}>
            {/* Área rellena solo para el usuario */}
            {esTu && (
              <>
                <defs>
                  <linearGradient id={`grad-${s.usuarioId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c6ff3a" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#c6ff3a" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d={`${path} L ${cx(s.puntos.length - 1)},${H} L ${cx(0)},${H} Z`}
                  fill={`url(#grad-${s.usuarioId})`}
                />
              </>
            )}
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={esTu ? 2.5 : 1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={esTu ? 1 : 0.45}
            />
            {/* Punto final */}
            {s.puntos.length >= 2 && (
              <circle
                cx={cx(s.puntos.length - 1)}
                cy={cy(s.puntos.at(-1) ?? 0)}
                r={esTu ? 4 : 3}
                fill={esTu ? "#0f2416" : "#1a2e1e"}
                stroke={color}
                strokeWidth={esTu ? 2 : 1.5}
                strokeOpacity={esTu ? 1 : 0.6}
              />
            )}
          </g>
        );
      })}

      {/* Etiquetas de nombre al final (sin solapamiento) */}
      {etiquetas.map(({ s, y, color }) => {
        const esTu = s.usuarioId === usuarioId;
        const pts = s.puntos.at(-1) ?? 0;
        return (
          <g key={`lbl-${s.usuarioId}`}>
            <text
              x={W - padR + 10}
              y={y + 4}
              fontSize={esTu ? 10 : 9}
              fontWeight={esTu ? "bold" : "normal"}
              fill={color}
              fillOpacity={esTu ? 1 : 0.65}
              fontFamily="system-ui, sans-serif"
            >
              {s.nombre.split(" ")[0]} {pts}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
