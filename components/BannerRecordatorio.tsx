"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

// inicio está guardado en UTC (timestamptz). Las cuentas regresivas se
// calculan contra Date.now() que también es UTC → no se necesita conversión.
// El cierre de predicciones ocurre 10 min antes del inicio.
const CIERRE_OFFSET_MS = 10 * 60 * 1000;
const VENTANA_MS       = 24 * 60 * 60 * 1000;

type PartidoPendiente = {
  id:               number;
  equipo_local:     string;
  equipo_visitante: string;
  inicio:           string; // ISO UTC
  fase:             string | null;
  grupo:            string | null;
  cierreMs:         number; // timestamp epoch del cierre
};

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
const f = (e: string) => BANDERAS[e] ?? "🏳️";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "cerrando…";
  const totalSec = Math.floor(ms / 1000);
  const h   = Math.floor(totalSec / 3600);
  const m   = Math.floor((totalSec % 3600) / 60);
  const s   = totalSec % 60;
  if (h > 0)  return `${h}h ${m}m`;
  if (m >= 1) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

function urgencyClass(ms: number): string {
  if (ms < 30 * 60 * 1000)  return "text-wc26-red";
  if (ms < 2 * 60 * 60 * 1000) return "text-amber-400";
  return "text-lima";
}

export function BannerRecordatorio() {
  const { session, cargando } = useAuth();
  const [pendientes,   setPendientes]   = useState<PartidoPendiente[]>([]);
  const [hayProximos,  setHayProximos]  = useState(false);
  const [now,          setNow]          = useState(() => Date.now());
  const [inicializado, setInicializado] = useState(false);

  // Tick cada segundo para la cuenta regresiva
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch de datos cada 60 s
  useEffect(() => {
    if (!session) return;

    async function cargar(uid: string) {
      const desde = new Date().toISOString();
      const hasta = new Date(Date.now() + VENTANA_MS).toISOString();

      const [{ data: ps }, { data: prs }] = await Promise.all([
        supabase
          .from("partidos")
          .select("id, equipo_local, equipo_visitante, inicio, fase, grupo")
          .gt("inicio", desde)
          .lte("inicio", hasta)
          .eq("finalizado", false)
          .order("inicio", { ascending: true }),
        supabase
          .from("pronosticos")
          .select("partido_id")
          .eq("usuario_id", uid),
      ]);

      const proximos = (ps ?? []) as PartidoPendiente[];
      const pronoIds = new Set((prs ?? []).map((p: any) => p.partido_id));

      setHayProximos(proximos.length > 0);

      const sinProno = proximos
        .map((p) => ({ ...p, cierreMs: new Date(p.inicio).getTime() - CIERRE_OFFSET_MS }))
        .filter((p) => !pronoIds.has(p.id) && p.cierreMs > Date.now());

      setPendientes(sinProno);
      setInicializado(true);
    }

    const uid = session.user.id;
    cargar(uid);
    const id = setInterval(() => cargar(uid), 60_000);
    return () => clearInterval(id);
  }, [session]);

  // Filtrar los que todavía están abiertos según el tick actual
  const abiertos = pendientes.filter((p) => p.cierreMs > now);

  if (cargando || !session || !inicializado) return null;

  // Todos pronosticados — mensaje positivo solo si hay partidos próximos
  if (abiertos.length === 0) {
    if (!hayProximos) return null;
    return (
      <div className="mb-6 overflow-hidden rounded-xl border border-lima/20 bg-lima/5">
        <div className="flex items-center gap-3 px-5 py-3">
          <span className="text-xl">✅</span>
          <p className="text-sm font-medium text-lima">
            ¡Vas al día! Ya tienes todos los pronósticos de las próximas 24 h.
          </p>
        </div>
        <BannerMultiplicadores />
      </div>
    );
  }

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-amber-400/30 bg-cancha-800">
      {/* Cabecera */}
      <div className="flex items-center gap-3 border-b border-cancha-600/30 px-5 py-3">
        <span className="text-lg">⚠️</span>
        <p className="flex-1 text-sm font-semibold text-amber-400">
          {abiertos.length === 1
            ? "Tienes 1 partido sin pronosticar"
            : `Tienes ${abiertos.length} partidos sin pronosticar`}
        </p>
        <Link
          href="/partidos"
          className="shrink-0 rounded-lg bg-lima px-4 py-1.5 text-xs font-bold text-carbon transition hover:scale-105 active:scale-95"
        >
          Ir a pronosticar
        </Link>
      </div>

      {/* Lista de partidos pendientes */}
      <ul className="divide-y divide-cancha-600/20">
        {abiertos.map((p) => {
          const restante = p.cierreMs - now;
          return (
            <li
              key={p.id}
              className="flex items-center gap-3 px-5 py-3"
            >
              {/* Etiqueta de fase/grupo */}
              <span className="hidden shrink-0 rounded bg-cancha-600/50 px-1.5 py-0.5 text-[10px] font-mono text-crema/40 sm:inline">
                {p.fase ?? p.grupo ?? "—"}
              </span>

              {/* Equipos */}
              <span className="flex-1 text-sm text-crema/80">
                {f(p.equipo_local)} {p.equipo_local}
                <span className="mx-1 text-crema/30">vs</span>
                {f(p.equipo_visitante)} {p.equipo_visitante}
              </span>

              {/* Cuenta regresiva */}
              <span className={`shrink-0 font-mono text-sm font-bold tabular ${urgencyClass(restante)}`}>
                {restante < 60 * 60 * 1000 && (
                  <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current align-middle" />
                )}
                {formatCountdown(restante)}
              </span>
            </li>
          );
        })}
      </ul>

      <BannerMultiplicadores />
    </div>
  );
}

const FASES = [
  { label: "Grupos",    multi: 1, color: "text-crema/25", bar: "bg-crema/15",   activa: false },
  { label: "16vos",     multi: 1, color: "text-crema/25", bar: "bg-crema/15",   activa: false },
  { label: "Octavos",   multi: 2, color: "text-crema/25", bar: "bg-crema/15",   activa: false },
  { label: "Cuartos",   multi: 3, color: "text-wc26-blue",bar: "bg-wc26-blue",  activa: false },
  { label: "Semis",     multi: 4, color: "text-amber-400",bar: "bg-amber-400",  activa: false },
  { label: "3er lugar", multi: 5, color: "text-wc26-red", bar: "bg-wc26-red",   activa: true  },
  { label: "Final",     multi: 5, color: "text-wc26-red", bar: "bg-wc26-red",   activa: true  },
];

function BannerMultiplicadores() {
  return (
    <div className="border-t border-cancha-600/25 px-5 py-3">
      <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-crema/30">
        <span>⚡</span> Los puntos se multiplican por fase
      </p>
      <div className="flex items-end gap-2">
        {FASES.map((f) => (
          <div key={f.label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`w-full rounded-sm ${f.bar}`}
              style={{ height: 4 + (f.multi - 1) * 7 }}
            />
            <span className={`font-mono font-black leading-none ${f.color} ${
              f.multi === 5 ? "text-base" :
              f.multi === 4 ? "text-sm"   :
              f.multi === 3 ? "text-xs"   : "text-[10px]"
            }`}>
              ×{f.multi}
            </span>
            <span className={`text-[8px] font-semibold uppercase tracking-wide ${f.color}`}>
              {f.label}
            </span>
            {f.activa && (
              <span className="rounded-full bg-wc26-blue px-1 py-px text-[7px] font-black text-white">
                NOW
              </span>
            )}
          </div>
        ))}
        <div className="ml-2 shrink-0 self-center rounded-lg border border-cancha-600/40 bg-cancha-700/50 px-3 py-2 text-[10px] leading-relaxed text-crema/40">
          <p><span className="font-bold text-lima">Exacto</span> → 3 pts</p>
          <p><span className="font-bold text-wc26-blue">Resultado</span> → 1 pt</p>
          <p><span className="font-bold text-crema/60">+Clasific.</span> → +2 pts</p>
        </div>
      </div>
    </div>
  );
}
