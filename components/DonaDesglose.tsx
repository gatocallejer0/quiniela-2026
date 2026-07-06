"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Label,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { calcularPuntos } from "@/lib/scoring";
import type { Partido, Pronostico } from "@/lib/types";

type Perfil = { id: string; nombre: string; puntos_extra: number };

const SEG = [
  { key: "exactos",    label: "Exacto",        color: "#c6ff3a" },
  { key: "resultados", label: "Resultado",     color: "#60a5fa" },
  { key: "extra",      label: "Clasificado",   color: "#fbbf24" },
  { key: "dinamicas",  label: "Actividades",   color: "#f97316" },
] as const;

function calcularDesglose(partidos: Partido[], pronos: Pronostico[], puntosExtra: number) {
  const map: Record<number, Pronostico> = {};
  pronos.forEach((p) => { map[p.partido_id] = p; });

  let exactos = 0, resultados = 0, extra = 0;
  for (const p of partidos) {
    const d = calcularPuntos(p, map[p.id]);
    if (!d) continue;
    if (d.marcador === 3) exactos    += 3 * d.multiplicador;
    if (d.marcador === 1) resultados += 1 * d.multiplicador;
    extra += d.clasificadoBonus * d.multiplicador;
  }
  const dinamicas = puntosExtra ?? 0;
  return { exactos, resultados, extra, dinamicas, total: exactos + resultados + extra + dinamicas };
}

// ── Tooltip ────────────────────────────────────────────────────────────────
function TooltipDesglose({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: item } = payload[0];
  return (
    <div
      style={{
        background: "rgba(10,28,16,0.96)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        padding: "10px 14px",
      }}
    >
      <div style={{ color: item.color, fontWeight: 700, marginBottom: 2, fontSize: 13 }}>
        {name}
      </div>
      <div style={{ color: "rgba(255,255,255,0.8)", fontFamily: "monospace", fontSize: 13 }}>
        {value} pts &middot; {item.pct}%
      </div>
    </div>
  );
}

// ── Label central ──────────────────────────────────────────────────────────
function LabelCentral({ viewBox, total }: { viewBox?: any; total: number }) {
  const { cx, cy } = viewBox ?? { cx: 0, cy: 0 };
  return (
    <g>
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#c6ff3a"
        fontSize={32}
        fontWeight={700}
        fontFamily="monospace"
      >
        {total}
      </text>
      <text
        x={cx}
        y={cy + 18}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="rgba(255,255,255,0.35)"
        fontSize={11}
        fontFamily="system-ui, sans-serif"
        letterSpacing={2}
      >
        PTS
      </text>
    </g>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export function DonaDesglose({ currentUid }: { currentUid: string }) {
  const [partidos,  setPartidos]  = useState<Partido[]>([]);
  const [pronos,    setPronos]    = useState<Pronostico[]>([]);
  const [perfiles,  setPerfiles]  = useState<Perfil[]>([]);
  const [selected,  setSelected]  = useState(currentUid);
  const [loading,   setLoading]   = useState(true);
  const [loadingPronos, setLoadingPronos] = useState(false);

  // Carga inicial: partidos finalizados + perfiles
  useEffect(() => {
    (async () => {
      const [{ data: ps }, { data: pfs }] = await Promise.all([
        supabase
          .from("partidos")
          .select("*")
          .eq("finalizado", true)
          .order("inicio", { ascending: true }),
        supabase.from("perfiles").select("id, nombre, puntos_extra").order("nombre"),
      ]);
      setPartidos((ps as Partido[]) ?? []);
      setPerfiles((pfs as Perfil[]) ?? []);
      setLoading(false);
    })();
  }, []);

  // Re-fetch pronósticos cuando cambia el usuario seleccionado.
  // Filtramos server-side por usuario_id para evitar el límite de 1000 filas.
  useEffect(() => {
    if (!selected) return;
    setLoadingPronos(true);
    (async () => {
      let all: Pronostico[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data } = await supabase
          .from("pronosticos")
          .select("*")
          .eq("usuario_id", selected)
          .range(from, from + PAGE - 1);
        const rows = (data as Pronostico[]) ?? [];
        all = all.concat(rows);
        if (rows.length < PAGE) break;
        from += PAGE;
      }
      setPronos(all);
      setLoadingPronos(false);
    })();
  }, [selected]);

  const puntosExtra = perfiles.find((p) => p.id === selected)?.puntos_extra ?? 0;

  const desglose = useMemo(
    () => calcularDesglose(partidos, pronos, puntosExtra),
    [partidos, pronos, puntosExtra],
  );

  const pieData = useMemo(() => {
    const { total } = desglose;
    return SEG.map((s) => ({
      name:  s.label,
      value: desglose[s.key],
      color: s.color,
      pct:   total > 0 ? Math.round((desglose[s.key] / total) * 100) : 0,
    })).filter((d) => d.value > 0);
  }, [desglose]);

  const nombreSeleccionado = perfiles.find((p) => p.id === selected)?.nombre ?? "";
  const esPropio = selected === currentUid;
  const cargando = loading || loadingPronos;

  if (loading) {
    return (
      <div className="mb-8 rounded-xl border border-cancha-600/30 bg-cancha-800 px-6 py-8">
        <p className="text-sm text-crema/30">Cargando desglose...</p>
      </div>
    );
  }

  if (desglose.total === 0 && !cargando) {
    return (
      <div className="mb-8 overflow-hidden rounded-xl border border-cancha-600/30 bg-cancha-800">
        <CabeceraYSelector
          perfiles={perfiles}
          selected={selected}
          currentUid={currentUid}
          onSelect={setSelected}
          esPropio={esPropio}
          nombre={nombreSeleccionado}
        />
        <p className="px-6 pb-8 text-sm text-crema/30">
          {loadingPronos ? "Cargando..." : "Sin puntos aún."}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-cancha-600/30 bg-cancha-800">
      <CabeceraYSelector
        perfiles={perfiles}
        selected={selected}
        currentUid={currentUid}
        onSelect={setSelected}
        esPropio={esPropio}
        nombre={nombreSeleccionado}
      />

      <div className="flex flex-col items-center gap-6 px-6 pb-6 md:flex-row md:gap-10">
        {/* Dona */}
        <div className="w-full max-w-[220px] shrink-0">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                innerRadius="58%"
                outerRadius="80%"
                startAngle={90}
                endAngle={-270}
                paddingAngle={pieData.length > 1 ? 3 : 0}
                isAnimationActive={false}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="transparent" />
                ))}
                <Label
                  content={(props) => <LabelCentral {...props} total={desglose.total} />}
                  position="center"
                />
              </Pie>
              <Tooltip content={<TooltipDesglose />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda con detalle */}
        <div className="flex w-full flex-col gap-3">
          {loadingPronos ? (
            <p className="text-sm text-crema/30">Actualizando...</p>
          ) : (
            SEG.map((s) => {
              const val = desglose[s.key];
              const pct = desglose.total > 0 ? Math.round((val / desglose.total) * 100) : 0;
              return (
                <div key={s.key} className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ background: s.color, opacity: val === 0 ? 0.2 : 1 }}
                  />
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <span
                        className="text-sm font-medium"
                        style={{ color: val > 0 ? s.color : "rgba(255,255,255,0.2)" }}
                      >
                        {s.label}
                      </span>
                      <span
                        className="font-mono text-base font-bold tabular"
                        style={{ color: val > 0 ? s.color : "rgba(255,255,255,0.15)" }}
                      >
                        {val} pts
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-cancha-700">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: s.color, opacity: val === 0 ? 0 : 0.8 }}
                      />
                    </div>
                  </div>
                  <span className="w-9 text-right font-mono text-xs text-crema/30 tabular">
                    {pct}%
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-componente cabecera + selector ─────────────────────────────────────
function CabeceraYSelector({
  perfiles,
  selected,
  currentUid,
  onSelect,
  esPropio,
  nombre,
}: {
  perfiles: Perfil[];
  selected: string;
  currentUid: string;
  onSelect: (id: string) => void;
  esPropio: boolean;
  nombre: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-4">
      <div>
        <span className="block font-mono text-[11px] uppercase tracking-widest text-crema/40">
          De dónde vienen los puntos
        </span>
        <span className="text-sm text-crema/60">
          {esPropio ? "Tu desglose" : `Desglose de ${nombre.split(" ")[0]}`}
        </span>
      </div>
      {perfiles.length > 1 && (
        <select
          value={selected}
          onChange={(e) => onSelect(e.target.value)}
          className="rounded-lg border border-cancha-600/50 bg-cancha-700 px-3 py-1.5 text-sm text-crema outline-none focus:border-lima/50 focus:ring-2 focus:ring-lima/20"
        >
          {perfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id === currentUid ? `${p.nombre} (tú)` : p.nombre}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
