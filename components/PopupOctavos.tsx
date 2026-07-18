"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/auth";

const STORAGE_KEY = "popup-final-2026-visto";

const FASES = [
  { label: "Grupos",    multi: 1, activa: false },
  { label: "16vos",     multi: 1, activa: false },
  { label: "Octavos",   multi: 2, activa: false },
  { label: "Cuartos",   multi: 3, activa: false },
  { label: "Semis",     multi: 4, activa: false },
  { label: "3er lugar", multi: 5, activa: true  },
  { label: "Final",     multi: 5, activa: true  },
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
        background: "rgba(0,0,0,0.80)",
        backdropFilter: "blur(8px)",
        animation: saliendo ? "fadeOut 0.35s ease forwards" : "fadeIn 0.3s ease forwards",
      }}
      onClick={cerrar}
    >
      <style>{`
        @keyframes fadeIn    { from { opacity:0 } to { opacity:1 } }
        @keyframes fadeOut   { from { opacity:1 } to { opacity:0 } }
        @keyframes slideUp   { from { transform:translateY(50px) scale(0.94); opacity:0 }
                                to  { transform:translateY(0)     scale(1);    opacity:1 } }
        @keyframes slideDown { from { transform:translateY(0)     scale(1);    opacity:1 }
                                to  { transform:translateY(50px)  scale(0.94); opacity:0 } }
        @keyframes pulseX3   { 0%,100% { transform:scale(1) drop-shadow(0 0 24px rgba(96,165,250,0.5)) }
                                50%    { transform:scale(1.1) } }
        @keyframes shimmerB  { 0% { background-position:200% center }
                               100% { background-position:-200% center } }
        @keyframes floatUp   { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-5px) } }
        @keyframes sparkle   { 0%,100% { opacity:0.3; transform:scale(0.8) }
                               50%     { opacity:1;   transform:scale(1.2) } }
      `}</style>

      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-cancha-900 shadow-2xl"
        style={{ animation: saliendo ? "slideDown 0.35s ease forwards" : "slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fondos decorativos */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-wc26-red/15 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-wc26-red/5 blur-2xl" />
        </div>

        {/* Header */}
        <div className="relative px-7 pt-7 pb-3 text-center">
          <div className="mx-auto mb-3 flex w-20 overflow-hidden rounded-full">
            <div className="h-1.5 flex-1 bg-wc26-red" />
            <div className="h-1.5 flex-1 bg-wc26-blue" />
            <div className="h-1.5 flex-1 bg-wc26-green" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-crema/40">FIFA World Cup 2026</p>

          {/* Estrellas decorativas */}
          <div className="my-2 flex items-center justify-center gap-3">
            {["0s","0.3s","0.6s","0.9s","1.2s"].map((d, i) => (
              <span key={i} className="text-amber-400/60" style={{ animation: `sparkle 1.8s ease-in-out ${d} infinite`, fontSize: i === 2 ? 18 : 12 }}>★</span>
            ))}
          </div>

          <h2
            className="font-display text-5xl uppercase leading-none"
            style={{
              background: "linear-gradient(90deg, #dc2626, #ffffff, #dc2626)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "shimmerB 3s linear infinite",
            }}
          >
            Gran Final
          </h2>
          <p className="font-display text-2xl uppercase text-crema/50">Mundial 2026</p>
          <p className="mt-1 text-xs text-crema/30">Tercer Lugar y Final — los últimos 2 partidos</p>
        </div>

        {/* Multiplicador */}
        <div className="relative px-7 py-4 text-center">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-crema/40">
            Ahora cada punto vale
          </p>
          <div
            className="inline-flex items-baseline gap-1"
            style={{ animation: "pulseX3 2.2s ease-in-out infinite" }}
          >
            <span
              className="font-display text-9xl font-black leading-none"
              style={{
                background: "linear-gradient(135deg, #dc2626 0%, #f87171 50%, #fecaca 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 28px rgba(220,38,38,0.45))",
              }}
            >
              ×5
            </span>
          </div>
          <p className="mt-1 text-sm text-crema/50">el quíntuple que en la fase de grupos</p>
        </div>

        {/* Escala de fases */}
        <div className="mx-7 mb-4 overflow-hidden rounded-2xl border border-cancha-600/40 bg-cancha-800/60 px-4 py-3">
          <p className="mb-3 text-center text-[9px] font-bold uppercase tracking-widest text-crema/25">
            Multiplicadores por fase
          </p>
          <div className="flex items-end justify-between gap-1">
            {FASES.map((f) => (
              <div key={f.label} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-sm ${
                    f.activa ? "bg-wc26-red" :
                    f.multi >= 5 ? "bg-crema/15" : "bg-cancha-600/40"
                  }`}
                  style={{ height: 4 + (f.multi - 1) * 7 }}
                />
                <span className={`font-mono font-black leading-none ${
                  f.activa    ? "text-wc26-red text-sm" :
                  f.multi > 4 ? "text-crema/25 text-[10px]" : "text-crema/20 text-[10px]"
                }`}>
                  ×{f.multi}
                </span>
                <span className={`text-[8px] font-semibold uppercase ${
                  f.activa ? "text-wc26-red/80" : "text-crema/20"
                }`}>
                  {f.label}
                </span>
                {f.activa && (
                  <span className="mt-0.5 rounded-full bg-wc26-red px-1.5 py-px text-[7px] font-black text-white">
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
            ¡Es la Gran Final! 🏆
          </p>
          <p className="mt-1 text-sm font-semibold text-wc26-red">
            Un partido vale hasta 25 puntos ahora.
          </p>
          <p className="mt-2 text-xs text-crema/40">
            (3 pts exacto + 2 clasificado) × 5 = 25 pts máximo por partido
          </p>
        </div>

        {/* Botón */}
        <div className="px-7 pb-7">
          <button
            onClick={cerrar}
            className="w-full rounded-2xl bg-wc26-red py-3.5 text-sm font-bold text-white transition hover:opacity-90 active:scale-95"
          >
            ¡A pronosticar Tercer Lugar y Final! 🏆
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
