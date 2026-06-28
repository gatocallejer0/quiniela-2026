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

const C = {
  yo:    "#c6ff3a",
  top1:  "#fbbf24",
  top2:  "#9ca3af",
  top3:  "#f97316",
  resto: "#374151",
};

type FilaJornada = {
  usuario_id:  string;
  nombre:      string;
  jornada_num: number;
  jornada:     string;
  puntos:      number;
};
type FilaTabla = { usuario_id: string; nombre: string; puntos: number };
type Usuario   = { id: string; nombre: string };

function getColor(uid: string, currentUid: string, top3: string[]) {
  if (uid === currentUid) return C.yo;
  if (uid === top3[0])    return C.top1;
  if (uid === top3[1])    return C.top2;
  if (uid === top3[2])    return C.top3;
  return C.resto;
}

function isHighlighted(uid: string, currentUid: string, top3: string[]) {
  return uid === currentUid || top3.includes(uid);
}

// ── Tooltip ────────────────────────────────────────────────────────────────
function Tip({
  active, payload, label, usuarios, currentUid, top3,
}: {
  active?: boolean; payload?: any[]; label?: string;
  usuarios: Usuario[]; currentUid: string; top3: string[];
}) {
  if (!active || !payload?.length) return null;

  const sorted = [...payload]
    .filter((p) => p.value != null)
    .sort((a, b) => b.value - a.value);

  const destacados = sorted.filter((p) => isHighlighted(p.dataKey, currentUid, top3));
  const resto      = sorted.filter((p) => !isHighlighted(p.dataKey, currentUid, top3));

  return (
    <div className="min-w-[160px] rounded-xl border border-cancha-600/40 bg-cancha-900/95 px-4 py-3 shadow-xl">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-crema/40">
        {label}
      </p>
      {destacados.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
          <span className="flex-1 text-xs text-crema/80">
            {p.dataKey === currentUid
              ? "Tú"
              : (usuarios.find((u) => u.id === p.dataKey)?.nombre ?? "").split(" ")[0]}
          </span>
          <span className="font-mono text-xs font-bold" style={{ color: p.color }}>
            {p.value} pts
          </span>
        </div>
      ))}
      {resto.length > 0 && (
        <p className="mt-1 text-[10px] text-crema/30">
          +{resto.length} más · mejor: {resto[0]?.value} pts
        </p>
      )}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export function GraficaEvolucion({ currentUid }: { currentUid: string }) {
  const [rows,    setRows]    = useState<FilaJornada[]>([]);
  const [tabla,   setTabla]   = useState<FilaTabla[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: r }, { data: t }] = await Promise.all([
        supabase.from("vista_puntos_por_jornada").select("*"),
        supabase
          .from("vista_tabla")
          .select("usuario_id, nombre, puntos")
          .order("puntos", { ascending: false }),
      ]);
      setRows((r as FilaJornada[]) ?? []);
      setTabla((t as FilaTabla[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const top3 = useMemo(
    () =>
      tabla
        .filter((f) => f.usuario_id !== currentUid)
        .slice(0, 3)
        .map((f) => f.usuario_id),
    [tabla, currentUid]
  );

  const usuarios = useMemo<Usuario[]>(() => {
    const map: Record<string, string> = {};
    rows.forEach((r) => { map[r.usuario_id] = r.nombre; });
    return Object.entries(map).map(([id, nombre]) => ({ id, nombre }));
  }, [rows]);

  // chartData: [{ jornada: 'J1', uid1: ptsAcum, uid2: ptsAcum, ... }, ...]
  const chartData = useMemo(() => {
    if (!rows.length) return [];

    // Jornadas únicas ordenadas por número
    const jornadasOrdenadas = Array.from(
      new Map(rows.map((r) => [r.jornada_num, r.jornada])).entries()
    )
      .sort(([a], [b]) => a - b)
      .map(([num, label]) => ({ num, label }));

    if (!jornadasOrdenadas.length) return [];

    // Puntos por usuario × jornada (sin acumular)
    const ptsPorUsuario: Record<string, Record<number, number>> = {};
    rows.forEach(({ usuario_id, jornada_num, puntos }) => {
      if (!ptsPorUsuario[usuario_id]) ptsPorUsuario[usuario_id] = {};
      ptsPorUsuario[usuario_id][jornada_num] = puntos;
    });

    const uids = Object.keys(ptsPorUsuario);

    return jornadasOrdenadas.map(({ num, label }, idx) => {
      const punto: Record<string, number | string> = { jornada: label };
      for (const uid of uids) {
        let acum = 0;
        for (let i = 0; i <= idx; i++) {
          acum += ptsPorUsuario[uid][jornadasOrdenadas[i].num] ?? 0;
        }
        punto[uid] = acum;
      }
      return punto;
    });
  }, [rows]);

  const leyenda = useMemo(() => {
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

  const nJornadas = chartData.length;
  // En móvil con muchas jornadas, mostrar cada N ticks para no saturar
  const tickInterval = nJornadas <= 10 ? 0 : nJornadas <= 20 ? 1 : Math.floor(nJornadas / 10);

  const renderTip = (props: any) => (
    <Tip {...props} usuarios={usuarios} currentUid={currentUid} top3={top3} />
  );

  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-cancha-600/30 bg-cancha-800">
      <div className="flex items-start justify-between px-6 pt-5 pb-4">
        <div>
          <span className="block font-mono text-[11px] uppercase tracking-widest text-crema/40">
            Evolución del ranking
          </span>
          <span className="text-sm text-crema/60">
            Puntos acumulados jornada a jornada
          </span>
        </div>
        <span className="rounded-full bg-lima/10 px-2 py-0.5 text-[10px] font-bold text-lima">
          {nJornadas} jornada{nJornadas !== 1 ? "s" : ""}
        </span>
      </div>

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
            dataKey="jornada"
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={tickInterval}
          />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10, fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
            width={34}
          />
          <Tooltip
            content={renderTip}
            cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }}
          />

          {/* Resto primero (debajo) */}
          {usuarios
            .filter((u) => !isHighlighted(u.id, currentUid, top3))
            .map((u) => (
              <Line
                key={u.id}
                type="monotone"
                dataKey={u.id}
                stroke={C.resto}
                strokeWidth={1}
                strokeOpacity={0.2}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            ))}

          {/* Top 3 encima */}
          {top3.map((uid) => (
            <Line
              key={uid}
              type="monotone"
              dataKey={uid}
              stroke={getColor(uid, currentUid, top3)}
              strokeWidth={2}
              strokeOpacity={0.85}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          ))}

          {/* Usuario actual — siempre encima de todo */}
          <Line
            type="monotone"
            dataKey={currentUid}
            stroke={C.yo}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: "#0f2416", stroke: C.yo }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 pb-5 pt-1">
        {leyenda.map((u) => {
          const color = getColor(u.id, currentUid, top3);
          return (
            <div key={u.id} className="flex items-center gap-1.5">
              <span className="h-[3px] w-5 rounded-full" style={{ background: color }} />
              <span className="text-xs text-crema/60">
                {u.id === currentUid ? "Tú" : u.nombre.split(" ")[0]}
              </span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5">
          <span className="h-[2px] w-5 rounded-full opacity-40" style={{ background: C.resto }} />
          <span className="text-xs text-crema/30">Otros</span>
        </div>
      </div>
    </div>
  );
}
