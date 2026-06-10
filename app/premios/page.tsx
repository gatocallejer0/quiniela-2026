"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Premio, PremioAdicional } from "@/lib/types";

export default function Premios() {
  const { session, cargando } = useAuth();
  const router = useRouter();
  const [premios, setPremios] = useState<Premio[]>([]);
  const [adicionales, setAdicionales] = useState<PremioAdicional[]>([]);
  const [numJugadores, setNumJugadores] = useState(0);
  const [cargandoData, setCargandoData] = useState(true);

  useEffect(() => {
    if (!cargando && !session) router.replace("/");
  }, [cargando, session, router]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const [{ data: prs }, { data: ads }, { count }] = await Promise.all([
          supabase.from("premios").select("*").order("posicion", { ascending: true }),
          supabase.from("premios_adicionales").select("*").order("id", { ascending: true }),
          supabase.from("perfiles").select("*", { count: "exact", head: true }),
        ]);
        setPremios((prs as Premio[]) ?? []);
        setAdicionales((ads as PremioAdicional[]) ?? []);
        setNumJugadores(count ?? 0);
      } catch (_) {
      } finally {
        setCargandoData(false);
      }
    })();
  }, [session]);

  if (cargando || !session) return null;

  const posicionLabel = (n: number) =>
    n === 1 ? "1er lugar" : n === 2 ? "2do lugar" : n === 3 ? "3er lugar" : `${n}o lugar`;

  const posicionColor = (n: number) =>
    n === 1 ? "bg-wc26-gold text-carbon" :
    n === 2 ? "bg-wc26-blue text-carbon" :
    n === 3 ? "bg-wc26-green text-white" :
    "bg-cancha-700 text-crema/60";

  return (
    <div className="aparece">
      <h1 className="font-display mb-1 text-5xl text-lima uppercase">Premios</h1>
      <p className="mb-6 text-sm text-crema/50">Lo que está en juego en la quiniela familiar.</p>

      {cargandoData ? (
        <p className="text-crema/40">Cargando...</p>
      ) : (
        <>
          {/* Pozo calculado */}
          {(() => {
            const CUOTA = 100;
            const pozo = numJugadores * CUOTA;
            const primero = Math.round(pozo * 0.70);
            const tercero = CUOTA;
            const segundo = pozo - primero - tercero;
            const filas = [
              { label: "1er lugar", color: "bg-wc26-gold text-carbon", desc: "70% del pozo", monto: `Q${primero}`, montoColor: "text-wc26-gold" },
              { label: "2do lugar", color: "bg-wc26-blue text-carbon", desc: "Lo que queda", monto: segundo > 0 ? `Q${segundo}` : "—", montoColor: "text-wc26-blue" },
              { label: "3er lugar", color: "bg-wc26-green text-white", desc: "Recupera inversión", monto: `Q${tercero}`, montoColor: "text-wc26-green" },
            ];
            return (
              <div className="mb-8 overflow-hidden rounded-xl bg-cancha-800 shadow-carta">
                <div className="flex items-center justify-between border-b border-cancha-600/30 px-6 py-5">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-widest text-crema/40">Pozo actual</p>
                    <p className="mt-1 text-xs text-crema/30">{numJugadores} participante{numJugadores !== 1 ? "s" : ""} · Q{CUOTA} c/u</p>
                  </div>
                  <div>
                    <p className="text-xs text-crema/30 text-right">Total</p>
                    <p className="font-mono text-lg font-bold text-lima">Q{pozo}</p>
                  </div>
                </div>
                <div className="divide-y divide-cancha-600/30">
                  {filas.map((f) => (
                    <div key={f.label} className="flex items-center gap-4 px-6 py-4">
                      <span className={`w-20 shrink-0 rounded-full px-3 py-0.5 text-center text-xs font-black ${f.color}`}>
                        {f.label}
                      </span>
                      <span className="flex-1 text-sm text-crema/60">{f.desc}</span>
                      <span className={`font-mono text-lg font-bold ${f.montoColor}`}>{f.monto}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Premios por lugar */}
          {premios.length > 0 && (
            <div className="mb-8 overflow-hidden rounded-xl bg-cancha-800 shadow-carta">
              <div className="flex items-center gap-3 border-b border-cancha-600/30 px-6 py-5">
                <p className="text-xs font-mono uppercase tracking-widest text-crema/40">Por lugar</p>
                <div className="flex overflow-hidden rounded-full" style={{ width: 48 }}>
                  <div className="h-0.5 flex-1 bg-wc26-gold" />
                  <div className="h-0.5 flex-1 bg-wc26-blue" />
                  <div className="h-0.5 flex-1 bg-wc26-green" />
                </div>
              </div>
              <div className="divide-y divide-cancha-600/30">
                {premios.map((pr) => (
                  <div key={pr.id} className="flex items-center gap-4 px-6 py-4">
                    <span className={`w-20 shrink-0 rounded-full px-3 py-0.5 text-center text-xs font-black ${posicionColor(pr.posicion)}`}>
                      {posicionLabel(pr.posicion)}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-crema">{pr.descripcion}</span>
                    {pr.valor && (
                      <span className="font-mono text-sm font-bold text-lima">{pr.valor}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Premios adicionales */}
          {adicionales.length > 0 && (
            <div className="overflow-hidden rounded-xl bg-cancha-800 shadow-carta">
              <div className="border-b border-cancha-600/30 px-6 py-5">
                <p className="text-xs font-mono uppercase tracking-widest text-crema/40">Premios adicionales</p>
                <p className="mt-1 text-xs text-crema/30">Por participación · sin lugar específico</p>
              </div>
              <div className="divide-y divide-cancha-600/30">
                {adicionales.map((a) => (
                  <div key={a.id} className="flex items-center gap-4 px-6 py-4">
                    <span className="w-2 h-2 shrink-0 rounded-full bg-crema/20" />
                    <span className="flex-1 text-sm font-semibold text-crema">{a.descripcion}</span>
                    {a.valor && (
                      <span className="font-mono text-sm font-bold text-lima">{a.valor}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {premios.length === 0 && adicionales.length === 0 && (
            <p className="text-center text-crema/30">Todavía sin premios definidos.</p>
          )}
        </>
      )}
    </div>
  );
}
