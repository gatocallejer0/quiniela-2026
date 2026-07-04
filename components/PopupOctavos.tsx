"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/auth";

const STORAGE_KEY = "popup-octavos-2026-visto";

const FASES = [
  { label: "Grupos",  multi: 1, activa: false },
  { label: "16vos",   multi: 1, activa: false },
  { label: "Octavos", multi: 2, activa: true  },
  { label: "Cuartos", multi: 3, activa: false },
  { label: "Semis",   multi: 4, activa: false },
  { label: "Final",   multi: 5, activa: false },
];

export function PopupOctavos() {
  const { session, cargando } = useAuth();
  const [visible, setVisible] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    if (cargando || !session) return;
    const visto = sessionStorage.getItem(STORAGE_KEY);
    if (!visto) setVisible(true);
  }, [cargando, session]);

  function cerrar() {
    setSaliendo(true);
    setTimeout(() => {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setVisible(false);
    }, 350);
  }

  if (!visible) return null;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0"
      style={{
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        animation: saliendo ? "fadeOut 0.35s ease forwards" : "fadeIn 0.3s ease forwards",
      }}
      onClick={cerrar}
    >
      <style>{`
        @keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
        @keyframes fadeOut  { from { opacity:1 } to { opacity:0 } }
        @keyframes slideUp  { from { transform:translateY(40px) scale(0.96); opacity:0 }
                               to  { transform:translateY(0)     scale(1);    opacity:1 } }
        @keyframes slideDown{ from { transform:translateY(0)     scale(1);    opacity:1 }
                               to  { transform:translateY(40px)  scale(0.96); opacity:0 } }
        @keyframes pulseX2  { 0%,100% { transform:scale(1) }  50% { transform:scale(1.08) } }
        @keyframes shimmer  { 0% { background-position:200% center }
                              100% { background-position:-200% center } }
        @keyframes floatUp  { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-6px) } }
      `}</style>

      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-cancha-900 shadow-2xl"
        style={{ animation: saliendo ? "slideDown 0.35s ease forwards" : "slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fondo decorativo */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-wc26-red/10 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-lima/10 blur-3xl" />
        </div>

        {/* Header */}
        <div className="relative px-7 pt-7 pb-4 text-center">
          {/* Banda de colores */}
          <div className="mx-auto mb-4 flex w-20 overflow-hidden rounded-full">
            <div className="h-1.5 flex-1 bg-wc26-red" />
            <div className="h-1.5 flex-1 bg-wc26-blue" />
            <div className="h-1.5 flex-1 bg-wc26-green" />
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.2em] text-crema/40">FIFA World Cup 2026</p>
          <h2
            className="mt-1 font-display text-5xl uppercase leading-none"
            style={{
              background: "linear-gradient(90deg, #c8f44d, #ffffff, #c8f44d)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "shimmer 3s linear infinite",
            }}
          >
            Octavos
          </h2>
          <p className="font-display text-2xl uppercase text-crema/60">de Final</p>
        </div>

        {/* Multiplicador central */}
        <div className="relative px-7 py-5 text-center">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-crema/40">
            Tus puntos ahora valen
          </p>
          <div
            className="inline-flex items-baseline gap-1"
            style={{ animation: "pulseX2 2s ease-in-out infinite" }}
          >
            <span
              className="font-display text-8xl font-black leading-none"
              style={{
                background: "linear-gradient(135deg, #c8f44d 0%, #a8d400 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "none",
                filter: "drop-shadow(0 0 20px rgba(200,244,77,0.4))",
              }}
            >
              ×2
            </span>
          </div>
          <p className="mt-1 text-sm text-crema/50">
            cada pronóstico correcto se multiplica
          </p>
        </div>

        {/* Escala de fases */}
        <div className="mx-7 mb-5 overflow-hidden rounded-2xl border border-cancha-600/40 bg-cancha-800/60 px-4 py-3">
          <p className="mb-3 text-center text-[9px] font-bold uppercase tracking-widest text-crema/25">
            Escala de multiplicadores
          </p>
          <div className="flex items-end justify-between gap-1">
            {FASES.map((f) => (
              <div key={f.label} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-sm transition-all ${
                    f.activa ? "bg-lima" :
                    f.multi >= 4 ? "bg-crema/20" :
                    "bg-cancha-600/50"
                  }`}
                  style={{ height: 4 + (f.multi - 1) * 7 }}
                />
                <span className={`font-mono font-black leading-none ${
                  f.activa ? "text-lima text-sm" :
                  f.multi === 5 ? "text-crema/30 text-xs" :
                  "text-crema/25 text-[10px]"
                }`}>
                  ×{f.multi}
                </span>
                <span className={`text-[8px] font-semibold uppercase ${
                  f.activa ? "text-lima/80" : "text-crema/25"
                }`}>
                  {f.label}
                </span>
                {f.activa && (
                  <span className="mt-0.5 rounded-full bg-lima px-1.5 py-px text-[7px] font-black text-carbon">
                    AHORA
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Frase motivacional */}
        <div
          className="mx-7 mb-5 rounded-2xl border border-wc26-red/20 bg-wc26-red/5 px-5 py-4 text-center"
          style={{ animation: "floatUp 3s ease-in-out infinite" }}
        >
          <p className="text-lg font-bold text-crema leading-snug">
            Nadie está eliminado —
          </p>
          <p className="text-base font-semibold text-lima">
            ¡en esta quiniela todos llegan a la Final! 🏆
          </p>
          <p className="mt-2 text-xs text-crema/40">
            Con los multiplicadores, la tabla puede cambiar todo en un partido.
          </p>
        </div>

        {/* Botón cerrar */}
        <div className="px-7 pb-7">
          <button
            onClick={cerrar}
            className="w-full rounded-2xl bg-lima py-3.5 font-bold text-carbon text-sm transition hover:bg-limaSoft active:scale-95"
          >
            ¡Entendido, a pronosticar! ⚽
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
