"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { session, cargando, entrar, registrar } = useAuth();
  const router = useRouter();
  const modo = "entrar";
  const [nombre, setNombre] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    if (session) router.replace("/partidos");
  }, [session, router]);

  async function enviar() {
    setError("");
    if (nombre.trim().length < 2) return setError("Escribe tu nombre.");
    if (pin.trim().length < 4) return setError("El PIN debe tener 4 digitos o mas.");
    setTrabajando(true);
    try {
      if (modo === "entrar") await entrar(nombre, pin);
      else await registrar(nombre, pin);
      router.replace("/partidos");
    } catch (e: any) {
      setError(e.message ?? "Algo salio mal.");
    } finally {
      setTrabajando(false);
    }
  }

  if (cargando) return null;

  return (
    <div className="aparece pitch-pattern mx-auto mt-10 max-w-sm">
      <div className="mb-8 text-center">
        <p className="font-display text-6xl leading-none text-lima">QUINIELA</p>
        <p className="font-display mt-1 text-3xl leading-none text-crema/60">
          Familia &middot; Mundial 2026
        </p>

        {/* Banda tricolor We Are 26 */}
        <div className="mx-auto mt-4 flex w-40 overflow-hidden rounded-full">
          <div className="h-1.5 flex-1 bg-wc26-red" />
          <div className="h-1.5 flex-1 bg-wc26-blue" />
          <div className="h-1.5 flex-1 bg-wc26-green" />
        </div>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.25em] text-crema/30">
          We Are 26
        </p>

        <p className="mt-3 text-sm text-crema/50">
          Pronostica el marcador exacto. 3 pts exacto &middot; 1 pt resultado &middot; 0 si fallas.
        </p>
      </div>

      <div className="rounded-2xl border border-cancha-600/40 bg-cancha-800 p-6 shadow-carta">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-crema/40">
          Tu nombre
        </label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. Cesar"
          className="mb-4 w-full rounded-xl border border-cancha-600 bg-cancha-700 px-4 py-3 text-crema placeholder:text-crema/30 outline-none focus:border-lima/60 focus:ring-2 focus:ring-lima/20"
        />

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-crema/40">
          PIN (4+ digitos)
        </label>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && enviar()}
          type="password"
          inputMode="numeric"
          placeholder="••••"
          className="w-full rounded-xl border border-cancha-600 bg-cancha-700 px-4 py-3 text-crema placeholder:text-crema/30 outline-none focus:border-lima/60 focus:ring-2 focus:ring-lima/20"
        />

        {error && <p className="mt-3 text-sm text-wc26-red">{error}</p>}

        <button
          onClick={enviar}
          disabled={trabajando}
          className="mt-5 w-full rounded-xl bg-lima py-3 font-bold text-carbon shadow-sm transition hover:bg-limaSoft hover:scale-[1.02] active:scale-95 disabled:opacity-60"
        >
          {trabajando ? "..." : "Entrar"}
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-crema/30">
        Recuerda tu nombre y PIN: son tu unica forma de entrar.
      </p>
    </div>
  );
}
