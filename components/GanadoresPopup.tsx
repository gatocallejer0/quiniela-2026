"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { FilaTabla } from "@/lib/types";

const STORAGE_KEY = "popup-ganadores-2026-visto";

const MEDALLAS = ["🥇", "🥈", "🥉"];
const COLORES  = ["text-wc26-gold", "text-wc26-blue", "text-wc26-green"];

export function GanadoresPopup() {
  const { session, cargando } = useAuth();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [top3, setTop3] = useState<FilaTabla[]>([]);

  useEffect(() => {
    if (cargando || !session) return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    (async () => {
      const { data: final } = await supabase
        .from("partidos")
        .select("finalizado")
        .eq("fase", "Final")
        .maybeSingle();
      if (!final?.finalizado) return;

      const { data: tabla } = await supabase
        .from("vista_tabla")
        .select("*")
        .order("puntos", { ascending: false })
        .limit(3);
      if (!tabla || tabla.length === 0) return;

      setTop3(tabla as FilaTabla[]);
      setVisible(true);
    })();
  }, [cargando, session]);

  function cerrar(irATabla: boolean) {
    setSaliendo(true);
    setTimeout(() => {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setVisible(false);
      if (irATabla) router.push("/tabla");
    }, 350);
  }

  if (!visible) return null;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0"
      style={{
        background: "rgba(0,0,0,0.80)",
        backdropFilter: "blur(8px)",
        animation: saliendo ? "fadeOut 0.35s ease forwards" : "fadeIn 0.3s ease forwards",
      }}
      onClick={() => cerrar(false)}
    >
      <style>{`
        @keyframes fadeIn    { from { opacity:0 } to { opacity:1 } }
        @keyframes fadeOut   { from { opacity:1 } to { opacity:0 } }
        @keyframes slideUp   { from { transform:translateY(50px) scale(0.94); opacity:0 }
                                to  { transform:translateY(0)     scale(1);    opacity:1 } }
        @keyframes slideDown { from { transform:translateY(0)     scale(1);    opacity:1 }
                                to  { transform:translateY(50px)  scale(0.94); opacity:0 } }
        @keyframes sparkle   { 0%,100% { opacity:0.3; transform:scale(0.8) }
                               50%     { opacity:1;   transform:scale(1.2) } }
        @keyframes shimmerB  { 0% { background-position:200% center }
                               100% { background-position:-200% center } }
        @keyframes floatUp   { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-5px) } }
      `}</style>

      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-cancha-900 shadow-2xl"
        style={{ animation: saliendo ? "slideDown 0.35s ease forwards" : "slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fondos decorativos */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-wc26-gold/15 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-wc26-blue/10 blur-3xl" />
        </div>

        {/* Header */}
        <div className="relative px-7 pt-7 pb-3 text-center">
          <div className="mx-auto mb-3 flex w-20 overflow-hidden rounded-full">
            <div className="h-1.5 flex-1 bg-wc26-gold" />
            <div className="h-1.5 flex-1 bg-wc26-blue" />
            <div className="h-1.5 flex-1 bg-wc26-green" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-crema/40">FIFA World Cup 2026</p>

          <div className="my-2 flex items-center justify-center gap-3">
            {["0s","0.3s","0.6s","0.9s","1.2s"].map((d, i) => (
              <span key={i} className="text-wc26-gold/60" style={{ animation: `sparkle 1.8s ease-in-out ${d} infinite`, fontSize: i === 2 ? 18 : 12 }}>★</span>
            ))}
          </div>

          <h2
            className="font-display text-4xl uppercase leading-none"
            style={{
              background: "linear-gradient(90deg, #fbbf24, #ffffff, #fbbf24)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "shimmerB 3s linear infinite",
            }}
          >
            ¡Ya hay ganadores!
          </h2>
          <p className="font-display text-xl uppercase text-crema/50">Quiniela Familiar 2026</p>
        </div>

        {/* Podio */}
        <div className="relative px-7 py-5">
          <div className="space-y-3">
            {top3.map((f, i) => (
              <div
                key={f.usuario_id}
                className="flex items-center gap-3 rounded-2xl border border-cancha-600/40 bg-cancha-800/60 px-4 py-3"
                style={{ animation: `floatUp 3s ease-in-out ${i * 0.2}s infinite` }}
              >
                <span className="text-3xl leading-none">{MEDALLAS[i]}</span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-lg font-black ${COLORES[i]}`}>{f.nombre}</p>
                  <p className="text-xs text-crema/40">{posicionTexto(i)} lugar</p>
                </div>
                <span className="font-mono text-2xl font-bold text-crema tabular">{f.puntos}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Frase motivacional */}
        <div className="mx-7 mb-5 rounded-2xl border border-wc26-gold/20 bg-wc26-gold/5 px-5 py-4 text-center">
          <p className="text-lg font-bold text-crema leading-snug">
            ¡Felicidades a los ganadores! 🏆
          </p>
          <p className="mt-1 text-xs text-crema/40">
            Revisa la tabla completa para ver todas las posiciones.
          </p>
        </div>

        {/* Botón */}
        <div className="px-7 pb-7">
          <button
            onClick={() => cerrar(true)}
            className="w-full rounded-2xl bg-wc26-gold py-3.5 text-sm font-bold text-carbon transition hover:opacity-90 active:scale-95"
          >
            ¡Ver la tabla! ⚽
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

function posicionTexto(i: number) {
  return i === 0 ? "1er" : i === 1 ? "2do" : "3er";
}
