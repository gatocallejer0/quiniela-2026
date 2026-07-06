"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { FilaTabla, PuntosAdicional } from "@/lib/types";
import { QuienesFaltan } from "@/components/QuienesFaltan";

const DonaDesglose = dynamic(
  () => import("@/components/DonaDesglose").then((m) => m.DonaDesglose),
  { ssr: false }
);



export default function Tabla() {
  const { session, perfil, cargando } = useAuth();
  const router = useRouter();
  const [filas, setFilas] = useState<FilaTabla[]>([]);
  const [filasAd, setFilasAd] = useState<(PuntosAdicional & { nombre: string })[]>([]);
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
        ] = await Promise.all([
          supabase.from("vista_tabla").select("*").order("puntos", { ascending: false }),
          supabase.from("puntos_adicionales").select("*"),
          supabase.from("perfiles").select("id, nombre"),
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

      {!cargando && session && (
        <DonaDesglose currentUid={session.user.id} />
      )}

      {cargandoData ? (
        <p className="text-crema/40">Cargando...</p>
      ) : (
        <>
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

          <div className="mt-8">
            <QuienesFaltan />
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
