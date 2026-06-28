"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/lib/supabase";

// Orden canónico de fases — el eje X respeta este orden
const FASE_ORDEN = [
  "Grupos",
  "Dieciseisavos",
  "Octavos",
  "Cuartos",
  "Semifinal",
  "Final",
];

// Paleta de colores para jugadores destacados
const C = {
  yo:    "#c6ff3a", // menta/lima — siempre el usuario actual
  top1:  "#fbbf24", // oro
  top2:  "#9ca3af", // plata
  top3:  "#f97316", // bronce
  resto: "#374151", // gris oscuro
};

type FilaFase  = { usuario_id: string; nombre: string; fase: string; puntos: number };
type FilaTabla = { usuario_id: string; nombre: string; puntos: number };
type Usuario   = { id: string; nombre: string };

function getColor(uid: string, currentUid: string, top3: string[]) {
  if (uid === currentUid)  return C.yo;
  if (uid === top3[0])     return C.top1;
  if (uid === top3[1])     return C.top2;
  if (uid === top3[2])     return C.top3;
  return C.resto;
}

function isHighlighted(uid: string, currentUid: string, top3: string[]) {
  return uid === currentUid || top3.includes(uid);
}

// ── Tooltip personalizado ──────────────────────────────────────────────────
function TooltipContenido({
  active,
  payload,
  label,
  usuarios,
  currentUid,
  top3,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  usuarios: Usuario[];
  currentUid: string;
  top3: string[];
}) {
  if (!active || !payload?.length) return null;

  const sorted = [...payload]
    .filter((p) => p.value != null)
    .sort((a, b) => b.value - a.value);

  const destacados = sorted.filter((p) => isHighlighted(p.dataKey, currentUid, top3));
  const resto = sorted.filter((p) => !isHighlighted(p.dataKey, currentUid, top3));

  const nombreDe = (uid: string) =>
    usuarios.find((u) => u.id === uid)?.nombre ?? uid;

  return (
    <div className="min-w-[170px] rounded-xl border border-cancha-600/40 bg-cancha-900/95 px-4 py-3 shadow-xl backdrop-blur-sm">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-crema/40">
        {label}
      </p>
      {destacados.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: p.color }}
          />
          <span className="flex-1 text-xs text-crema/80">
            {p.dataKey === currentUid ? "Tú" : nombreDe(p.dataKey).split(" ")[0]}
          </span>
          <span className="font-mono text-xs font-bold" style={{ color: p.color }}>
            {p.value} pts
          </span>
        </div>
      ))}
      {resto.length > 0 && (
        <p className="mt-1 text-[10px] text-crema/30">
          +{resto.length} otros (mejor: {resto[0]?.value} pts)
        </p>
      )}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export function GraficaEvolucion({ currentUid }: { currentUid: string }) {
  const [rows,   setRows]   = useState<FilaFase[]>([]);
  const [tabla,  setTabla]  = useState<FilaTabla[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: r }, { data: t }] = await Promise.all([
        supabase.from("vista_puntos_por_fase").select("*"),
        supabase
          .from("vista_tabla")
          .select("usuario_id, nombre, puntos")
          .order("puntos", { ascending: false }),
      ]);
      setRows((r as FilaFase[]) ?? []);
      setTabla((t as FilaTabla[]) ?? []);
      setLoading(false);
    })();
  }, []);

  // Top 3 IDs (excluyendo al usuario actual para la paleta de colores)
  const top3 = useMemo(
    () => tabla.filter((f) => f.usuario_id !== currentUid).slice(0, 3).map((f) => f.usuario_id),
    [tabla, currentUid]
  );

  // Usuarios únicos (mapeados a {id, nombre})
  const usuarios = useMemo<Usuario[]>(() => {
    const map: Record<string, string> = {};
    rows.forEach((r) => { map[r.usuario_id] = r.nombre; });
    return Object.entries(map).map(([id, nombre]) => ({ id, nombre }));
  }, [rows]);

  // Datos del gráfico: [{ fase, uid1: ptsAcum, uid2: ptsAcum, ... }]
  const chartData = useMemo(() => {
    if (!rows.length) return [];

    // Fases presentes en los datos, en orden canónico
    const fasesEnData = new Set(rows.map((r) => r.fase));
    const fases = FASE_ORDEN.filter((f) => fasesEnData.has(f));
    if (!fases.length) return [];

    // Puntos por fase por usuario (sin acumular)
    const ptsPorUsuario: Record<string, Record<string, number>> = {};
    rows.forEach(({ usuario_id, fase, puntos }) => {
      if (!ptsPorUsuario[usuario_id]) ptsPorUsuario[usuario_id] = {};
      ptsPorUsuario[usuario_id][fase] = puntos;
    });

    const uids = Object.keys(ptsPorUsuario);

    // Acumular fase a fase
    return fases.map((fase, idx) => {
      const punto: Record<string, number | string> = { fase };
      for (const uid of uids) {
        let acum = 0;
        for (let i = 0; i <= idx; i++) {
          acum += ptsPorUsuario[uid][fases[i]] ?? 0;
        }
        punto[uid] = acum;
      }
      return punto;
    });
  }, [rows]);

  // Leyenda: usuario + top3 que no sea el usuario
  const destacadosLeyenda = useMemo(() => {
    const ids = [currentUid, ...top3.filter((id) => id !== currentUid)];
    return ids
      .map((id) => usuarios.find((u) => u.id === id))
      .filter(Boolean) as Usuario[];
  }, [currentUid, top3, usuarios]);

  if (loading) {
    return (
      <div className="mb-8 rounded-xl border border-cancha-600/30 bg-cancha-800 px-6 py-8">
        <p className="text-sm text-crema/30">Cargando evolución...</p>
      </div>
    );
  }

  if (!chartData.length) return null;

  const renderTooltip = (props: any) => (
    <TooltipContenido
      {...props}
      usuarios={usuarios}
      currentUid={currentUid}
      top3={top3}
    />
  );

  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-cancha-600/30 bg-cancha-800">
      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-5 pb-4">
        <div>
          <span className="block font-mono text-[11px] uppercase tracking-widest text-crema/40">
            Evolución del ranking
          </span>
          <span className="text-sm text-crema/60">
            Puntos acumulados ronda a ronda
          </span>
        </div>
        <span className="rounded-full bg-lima/10 px-2 py-0.5 text-[10px] font-bold text-lima">
          {chartData.length} fase{chartData.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Gráfica */}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart
          data={chartData}
          margin={{ top: 4, right: 20, left: -18, bottom: 4 }}
        >
          <CartesianGrid
            stroke="rgba(255,255,255,0.04)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="fase"
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10, fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
            width={34}
          />
          <Tooltip
            content={renderTooltip}
            cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }}
          />

          {/* Líneas: resto primero (abajo), destacados encima */}
          {usuarios
            .filter((u) => !isHighlighted(u.id, currentUid, top3))
            .map((u) => (
              <Line
                key={u.id}
                type="monotone"
                dataKey={u.id}
                stroke={C.resto}
                strokeWidth={1}
                strokeOpacity={0.22}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            ))}

          {/* Top 3 (sin el usuario actual) */}
          {top3.map((uid) => (
            <Line
              key={uid}
              type="monotone"
              dataKey={uid}
              stroke={getColor(uid, currentUid, top3)}
              strokeWidth={2}
              strokeOpacity={0.85}
              dot={{ r: 3, strokeWidth: 0, fill: getColor(uid, currentUid, top3) }}
              activeDot={{ r: 5, strokeWidth: 2, fill: getColor(uid, currentUid, top3) }}
              isAnimationActive={false}
            />
          ))}

          {/* Usuario actual — siempre encima */}
          <Line
            type="monotone"
            dataKey={currentUid}
            stroke={C.yo}
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 2, fill: "#0f2416", stroke: C.yo }}
            activeDot={{ r: 6, strokeWidth: 2, fill: "#0f2416", stroke: C.yo }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Leyenda compacta */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 pb-5 pt-1">
        {destacadosLeyenda.map((u) => {
          const color = getColor(u.id, currentUid, top3);
          const label = u.id === currentUid ? "Tú" : u.nombre.split(" ")[0];
          return (
            <div key={u.id} className="flex items-center gap-1.5">
              <span
                className="h-[3px] w-5 rounded-full"
                style={{ background: color }}
              />
              <span className="text-xs text-crema/60">{label}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5">
          <span
            className="h-[2px] w-5 rounded-full"
            style={{ background: C.resto, opacity: 0.5 }}
          />
          <span className="text-xs text-crema/30">Otros</span>
        </div>
      </div>
    </div>
  );
}
