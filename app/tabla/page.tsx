"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { FilaTabla, Partido, Pronostico, PuntosAdicional } from "@/lib/types";
import { calcularPuntos } from "@/lib/scoring";

export default function Tabla() {
  const { session, perfil, cargando } = useAuth();
  const router = useRouter();
  const [filas, setFilas] = useState<FilaTabla[]>([]);
  const [filasAd, setFilasAd] = useState<(PuntosAdicional & { nombre: string })[]>([]);
  const [seriePuntos, setSeriePuntos] = useState<number[]>([]);
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
          { data: prsUser },
        ] = await Promise.all([
          supabase.from("vista_tabla").select("*").order("puntos", { ascending: false }),
          supabase.from("puntos_adicionales").select("*"),
          supabase.from("perfiles").select("id, nombre"),
          supabase.from("partidos").select("*").eq("finalizado", true).order("inicio", { ascending: true }),
          supabase.from("pronosticos").select("*").eq("usuario_id", session.user.id),
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

        // Construir serie de puntos acumulados por partido jugado
        const pronosMap: Record<number, Pronostico> = {};
        (prsUser as Pronostico[] | null)?.forEach((p) => { pronosMap[p.partido_id] = p; });
        let acum = 0;
        const serie: number[] = [0];
        for (const p of (psFin as Partido[] | null) ?? []) {
          const d = calcularPuntos(p, pronosMap[p.id]);
          if (!d) continue;
          acum += d.total;
          serie.push(acum);
        }
        setSeriePuntos(serie);
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

      {/* Posiciones */}
      {cargandoData ? (
        <p className="text-crema/40">Cargando...</p>
      ) : (
        <>
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

          {/* Gráfica personal — solo visible para el usuario logueado */}
          {seriePuntos.length >= 2 && (
            <div className="mt-8 overflow-hidden rounded-xl border border-cancha-600/30 bg-cancha-800">
              <div className="flex items-center justify-between px-6 pt-5 pb-3">
                <div>
                  <span className="block text-xs font-mono uppercase tracking-widest text-crema/40">
                    Mi progreso
                  </span>
                  <span className="text-sm text-crema/60">
                    Solo visible para ti &middot; {seriePuntos.length - 1} partidos
                  </span>
                </div>
                <span className="font-mono text-3xl font-bold text-lima tabular">
                  {seriePuntos[seriePuntos.length - 1]} pts
                </span>
              </div>
              <GraficaPuntaje serie={seriePuntos} />
              <div className="flex justify-between px-6 pb-4 pt-1">
                <span className="text-xs text-crema/30">Inicio</span>
                <span className="text-xs text-crema/30">Hoy</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Puntos adicionales */}
      {!cargandoData && filasAd.length > 0 && (
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
    </div>
  );
}

function GraficaPuntaje({ serie }: { serie: number[] }) {
  const W = 600, H = 110;
  const padL = 8, padR = 8, padT = 12, padB = 8;

  const maxV = Math.max(...serie, 1);
  const x = (i: number) => padL + (i / (serie.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / maxV) * (H - padT - padB);

  const linePoints = serie.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const areaPath =
    `M ${x(0)},${y(serie[0])} ` +
    serie.slice(1).map((v, i) => `L ${x(i + 1)},${y(v)}`).join(" ") +
    ` L ${x(serie.length - 1)},${H} L ${x(0)},${H} Z`;

  const lastX = x(serie.length - 1);
  const lastY = y(serie[serie.length - 1]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height: 110 }}
    >
      <defs>
        <linearGradient id="gradPuntaje" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c6ff3a" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#c6ff3a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Línea de referencia horizontal (máximo) */}
      <line
        x1={padL} y1={padT} x2={W - padR} y2={padT}
        stroke="#c6ff3a" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="4 4"
      />
      {/* Área bajo la curva */}
      <path d={areaPath} fill="url(#gradPuntaje)" />
      {/* Línea principal */}
      <polyline
        points={linePoints}
        fill="none"
        stroke="#c6ff3a"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Punto final destacado */}
      <circle cx={lastX} cy={lastY} r="4" fill="#0f2416" stroke="#c6ff3a" strokeWidth="2" />
    </svg>
  );
}
