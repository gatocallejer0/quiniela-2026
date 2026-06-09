"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Regla } from "@/lib/types";

export default function Reglas() {
  const { session, cargando } = useAuth();
  const router = useRouter();
  const [reglas, setReglas] = useState<Regla[]>([]);
  const [cargandoData, setCargandoData] = useState(true);

  useEffect(() => {
    if (!cargando && !session) router.replace("/");
  }, [cargando, session, router]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data } = await supabase
        .from("reglas")
        .select("*")
        .order("orden", { ascending: true });
      setReglas((data as Regla[]) ?? []);
      setCargandoData(false);
    })();
  }, [session]);

  if (cargando || !session) return null;

  return (
    <div className="aparece">
      <h1 className="font-display mb-1 text-5xl text-lima uppercase">Reglas</h1>
      <p className="mb-6 text-sm text-crema/50">Cómo funciona la quiniela familiar.</p>

      {/* Puntuación — fija */}
      <div className="mb-8 overflow-hidden rounded-xl bg-cancha-800 shadow-carta">
        <div className="border-b border-cancha-600/30 px-6 py-5">
          <p className="text-xs font-mono uppercase tracking-widest text-crema/40">Puntuación</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-cancha-600/30">
          <div className="flex flex-col items-center p-5 text-center bg-cancha-700/30 hover:bg-cancha-700/60 transition-colors">
            <p className="text-3xl mb-1">🎯</p>
            <p className="font-mono text-4xl font-bold text-wc26-gold">3</p>
            <p className="mt-2 text-xs font-bold text-crema/80">Marcador exacto</p>
            <p className="text-[10px] text-crema/40 mt-0.5">Adivinas el score</p>
          </div>
          <div className="flex flex-col items-center p-5 text-center bg-cancha-700/30 hover:bg-cancha-700/60 transition-colors">
            <p className="text-3xl mb-1">⚽</p>
            <p className="font-mono text-4xl font-bold text-wc26-blue">1</p>
            <p className="mt-2 text-xs font-bold text-crema/80">Resultado correcto</p>
            <p className="text-[10px] text-crema/40 mt-0.5">Gana, empata o pierde</p>
          </div>
          <div className="flex flex-col items-center p-5 text-center bg-cancha-700/30 hover:bg-cancha-700/60 transition-colors">
            <p className="text-3xl mb-1">😬</p>
            <p className="font-mono text-4xl font-bold text-wc26-red">0</p>
            <p className="mt-2 text-xs font-bold text-crema/80">No acertado</p>
            <p className="text-[10px] text-crema/40 mt-0.5">Ni el resultado</p>
          </div>
        </div>
      </div>

      {/* Reglas del admin */}
      {cargandoData ? (
        <p className="text-crema/40">Cargando...</p>
      ) : reglas.length > 0 ? (
        <div className="overflow-hidden rounded-xl bg-cancha-800 shadow-carta">
          <div className="border-b border-cancha-600/30 px-6 py-5">
            <p className="text-xs font-mono uppercase tracking-widest text-crema/40">Otras reglas</p>
          </div>
          <div className="divide-y divide-cancha-600/30">
            {reglas.map((r) => (
              <div key={r.id} className="px-6 py-4 hover:bg-cancha-700/40 transition-colors">
                <p className="text-sm font-semibold text-crema">{r.titulo}</p>
                {r.descripcion && (
                  <p className="mt-0.5 text-xs text-crema/50">{r.descripcion}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
