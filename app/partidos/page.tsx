"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Partido, Pronostico } from "@/lib/types";

const TZ = "America/Guatemala";

const BANDERAS: Record<string, string> = {
  "Alemania": "🇩🇪", "Arabia Saudita": "🇸🇦", "Argelia": "🇩🇿",
  "Argentina": "🇦🇷", "Australia": "🇦🇺", "Austria": "🇦🇹",
  "Bélgica": "🇧🇪", "Bosnia y Herzegovina": "🇧🇦", "Brasil": "🇧🇷",
  "Cabo Verde": "🇨🇻", "Canadá": "🇨🇦", "Colombia": "🇨🇴",
  "Corea del Sur": "🇰🇷", "Costa de Marfil": "🇨🇮", "Croacia": "🇭🇷",
  "Curazao": "🇨🇼", "Ecuador": "🇪🇨", "Egipto": "🇪🇬",
  "Escocia": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "España": "🇪🇸", "Estados Unidos": "🇺🇸",
  "Francia": "🇫🇷", "Ghana": "🇬🇭", "Haití": "🇭🇹",
  "Inglaterra": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Irán": "🇮🇷", "Irak": "🇮🇶",
  "Japón": "🇯🇵", "Jordania": "🇯🇴", "Marruecos": "🇲🇦",
  "México": "🇲🇽", "Nigeria": "🇳🇬", "Noruega": "🇳🇴",
  "Nueva Zelanda": "🇳🇿", "Países Bajos": "🇳🇱", "Panamá": "🇵🇦",
  "Paraguay": "🇵🇾", "Portugal": "🇵🇹", "Qatar": "🇶🇦",
  "RD Congo": "🇨🇩", "República Checa": "🇨🇿", "Senegal": "🇸🇳",
  "Sudáfrica": "🇿🇦", "Suecia": "🇸🇪", "Suiza": "🇨🇭",
  "Túnez": "🇹🇳", "Turquía": "🇹🇷", "Uruguay": "🇺🇾",
  "Uzbekistán": "🇺🇿",
};

const bandera = (equipo: string) => BANDERAS[equipo] ?? "";

function fmtFecha(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-GT", {
    timeZone: TZ,
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function puntosDe(p: Partido, pr?: Pronostico): number | null {
  if (!p.finalizado || !pr || p.goles_local_final == null) return null;
  if (
    pr.goles_local === p.goles_local_final &&
    pr.goles_visitante === p.goles_visitante_final
  )
    return 3;
  const signoPred = Math.sign(pr.goles_local - pr.goles_visitante);
  const signoReal = Math.sign(p.goles_local_final - (p.goles_visitante_final ?? 0));
  return signoPred === signoReal ? 1 : 0;
}

export default function Partidos() {
  const { session, perfil, cargando } = useAuth();
  const router = useRouter();
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [pronos, setPronos] = useState<Record<number, Pronostico>>({});
  const [cargandoData, setCargandoData] = useState(true);
  const [filtroEquipo, setFiltroEquipo] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [pasadosAbiertos, setPasadosAbiertos] = useState(false);

  useEffect(() => {
    if (!cargando && !session) router.replace("/");
  }, [cargando, session, router]);

  const cargarDatos = useCallback(async (userId: string) => {
    setCargandoData(true);
    const limite = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000));
    try {
      const [{ data: ps }, { data: prs }] = await Promise.race([
        Promise.all([
          supabase.from("partidos").select("*").order("inicio", { ascending: true }),
          supabase.from("pronosticos").select("*").eq("usuario_id", userId),
        ]),
        limite.then(() => { throw new Error("timeout"); }),
      ]) as any;
      setPartidos((ps as Partido[]) ?? []);
      const mapa: Record<number, Pronostico> = {};
      (prs as Pronostico[] | null)?.forEach((p) => (mapa[p.partido_id] = p));
      setPronos(mapa);
    } catch (_) {
    } finally {
      setCargandoData(false);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    cargarDatos(session.user.id);
  }, [session, cargarDatos]);

  useEffect(() => {
    if (!session) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") cargarDatos(session.user.id);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [session, cargarDatos]);

  if (cargando || !session) return null;

  const finalizados = partidos.filter((p) => p.finalizado && pronos[p.id]);
  const totalPuntos = finalizados.reduce((sum, p) => sum + (puntosDe(p, pronos[p.id]) ?? 0), 0);
  const exactos    = finalizados.filter((p) => puntosDe(p, pronos[p.id]) === 3).length;
  const resultados = finalizados.filter((p) => puntosDe(p, pronos[p.id]) === 1).length;
  const fallidos   = finalizados.length - exactos - resultados;

  const fechaGT = (iso: string) =>
    new Intl.DateTimeFormat("es-GT", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" })
      .format(new Date(iso));

  const fechaLabel = (iso: string) =>
    new Intl.DateTimeFormat("es-GT", { timeZone: TZ, weekday: "short", day: "2-digit", month: "short" })
      .format(new Date(iso));

  const equipos = [...new Set(partidos.flatMap((p) => [p.equipo_local, p.equipo_visitante]))].sort();
  const fechas  = [...new Map(partidos.map((p) => [fechaGT(p.inicio), p.inicio])).entries()];

  const partidosFiltrados = partidos.filter((p) => {
    if (filtroEquipo && p.equipo_local !== filtroEquipo && p.equipo_visitante !== filtroEquipo) return false;
    if (filtroFecha && fechaGT(p.inicio) !== filtroFecha) return false;
    return true;
  });

  return (
    <div className="aparece">
      <h1 className="font-display mb-1 text-5xl text-lima uppercase">Partidos</h1>
      <p className="mb-6 text-sm text-crema/50">
        El pron&oacute;stico se bloquea 10 minutos antes de cada partido.
      </p>

      {/* Stats card */}
      {!cargandoData && finalizados.length > 0 && (
        <div className="mb-8 overflow-hidden rounded-xl bg-cancha-800 shadow-carta">
          {/* Fila superior */}
          <div className="flex items-center justify-between border-b border-cancha-600/30 p-6 md:p-8">
            <div>
              <span className="block text-xs font-mono uppercase tracking-widest text-crema/40">
                Mis Puntos
              </span>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="font-mono text-6xl font-bold text-lima leading-none tabular">
                  {totalPuntos}
                </span>
                <span className="text-crema/50 text-sm">
                  {finalizados.length} partido{finalizados.length !== 1 ? "s" : ""} jugado{finalizados.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <span
              className="material-symbols-outlined text-5xl text-lima/20 select-none"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 48" }}
            >
              workspace_premium
            </span>
          </div>
          {/* Grid 3 columnas */}
          <div className="grid grid-cols-3 divide-x divide-cancha-600/30">
            <div className="flex flex-col items-center p-5 text-center hover:bg-cancha-700/50 transition-colors">
              <div className="font-mono text-3xl font-bold text-crema mb-1">{exactos}</div>
              <span className="rounded-full bg-lima px-2 py-0.5 text-[10px] font-black text-carbon">Exacto</span>
              <div className="text-xs text-crema/40 mt-1">{exactos * 3} pts</div>
            </div>
            <div className="flex flex-col items-center p-5 text-center hover:bg-cancha-700/50 transition-colors">
              <div className="font-mono text-3xl font-bold text-crema mb-1">{resultados}</div>
              <span className="rounded-full bg-wc26-blue/20 px-2 py-0.5 text-[10px] font-black text-wc26-blue">Resultado</span>
              <div className="text-xs text-crema/40 mt-1">{resultados} pts</div>
            </div>
            <div className="flex flex-col items-center p-5 text-center hover:bg-cancha-700/50 transition-colors">
              <div className="font-mono text-3xl font-bold text-crema mb-1">{fallidos}</div>
              <span className="rounded-full bg-wc26-red/20 px-2 py-0.5 text-[10px] font-black text-wc26-red">Fallido</span>
              <div className="text-xs text-crema/40 mt-1">0 pts</div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      {!cargandoData && partidos.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <select
            value={filtroEquipo}
            onChange={(e) => setFiltroEquipo(e.target.value)}
            className="flex-1 rounded-xl border border-cancha-600 bg-cancha-800 px-4 py-2.5 text-sm text-crema outline-none focus:border-lima"
          >
            <option value="">Todos los países</option>
            {equipos.map((eq) => (
              <option key={eq} value={eq}>{bandera(eq)} {eq}</option>
            ))}
          </select>
          <select
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className="flex-1 rounded-xl border border-cancha-600 bg-cancha-800 px-4 py-2.5 text-sm text-crema outline-none focus:border-lima"
          >
            <option value="">Todas las fechas</option>
            {fechas.map(([fecha, iso]) => (
              <option key={fecha} value={fecha}>{fechaLabel(iso)}</option>
            ))}
          </select>
          {(filtroEquipo || filtroFecha) && (
            <button
              onClick={() => { setFiltroEquipo(""); setFiltroFecha(""); }}
              className="rounded-xl border border-cancha-600 px-4 py-2.5 text-sm text-crema/50 hover:text-crema transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>
      )}

      {cargandoData ? (
        <p className="text-crema/40">Cargando partidos...</p>
      ) : partidos.length === 0 ? (
        <p className="text-crema/40">
          Aun no hay partidos cargados. (El admin debe cargar el calendario.)
        </p>
      ) : (() => {
        const pasados = partidosFiltrados.filter((p) => p.finalizado);
        const proximos = partidosFiltrados.filter((p) => !p.finalizado);
        return (
          <div className="space-y-3">
            {partidosFiltrados.length === 0 ? (
              <p className="py-8 text-center text-crema/40">No hay partidos con ese filtro.</p>
            ) : (
              <>
                {/* Partidos pasados colapsados */}
                {pasados.length > 0 && (
                  <div>
                    <button
                      onClick={() => setPasadosAbiertos((v) => !v)}
                      className="mb-3 flex w-full items-center justify-between gap-2 rounded-xl border border-cancha-600/30 bg-cancha-800/50 px-4 py-2.5 text-left"
                    >
                      <span className="text-xs font-semibold text-crema/40">
                        {pasados.length} partido{pasados.length !== 1 ? "s" : ""} anterior{pasados.length !== 1 ? "es" : ""}
                      </span>
                      <span
                        className="material-symbols-outlined text-base text-crema/30 transition-transform duration-200"
                        style={{ transform: pasadosAbiertos ? "rotate(0deg)" : "rotate(-90deg)" }}
                      >
                        expand_more
                      </span>
                    </button>
                    {pasadosAbiertos && (
                      <div className="space-y-3 mb-3">
                        {pasados.map((p) => (
                          <CartaPartido
                            key={p.id}
                            partido={p}
                            prono={pronos[p.id]}
                            usuarioId={session.user.id}
                            esAdmin={perfil?.es_admin ?? false}
                            onGuardado={(pr) => setPronos((m) => ({ ...m, [p.id]: pr }))}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* Partidos actuales y próximos */}
                {proximos.map((p) => (
                  <CartaPartido
                    key={p.id}
                    partido={p}
                    prono={pronos[p.id]}
                    usuarioId={session.user.id}
                    esAdmin={perfil?.es_admin ?? false}
                    onGuardado={(pr) => setPronos((m) => ({ ...m, [p.id]: pr }))}
                  />
                ))}
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function CartaPartido({
  partido,
  prono,
  usuarioId,
  esAdmin,
  onGuardado,
}: {
  partido: Partido;
  prono?: Pronostico;
  usuarioId: string;
  esAdmin: boolean;
  onGuardado: (p: Pronostico) => void;
}) {
  const iniciado = useMemo(
    () => new Date(partido.inicio).getTime() - 10 * 60 * 1000 <= Date.now(),
    [partido.inicio]
  );
  const bloqueado = partido.finalizado || (!esAdmin && iniciado);

  const [local, setLocal] = useState(prono ? String(prono.goles_local) : "");
  const [visita, setVisita] = useState(prono ? String(prono.goles_visitante) : "");
  const [estado, setEstado] = useState<"" | "guardando" | "ok" | "error">("");
  const [msg, setMsg] = useState("");

  const pts = puntosDe(partido, prono);

  async function guardar() {
    if (local === "" || visita === "") {
      setEstado("error");
      setMsg("Pon ambos marcadores.");
      return;
    }
    setEstado("guardando");
    const fila: Pronostico = {
      usuario_id: usuarioId,
      partido_id: partido.id,
      goles_local: Number(local),
      goles_visitante: Number(visita),
    };
    const { error } = await supabase
      .from("pronosticos")
      .upsert(fila, { onConflict: "usuario_id,partido_id" });
    if (error) {
      setEstado("error");
      setMsg(error.message.includes("policy") ? "El partido ya empezo: pronostico bloqueado." : error.message);
    } else {
      setEstado("ok");
      setMsg("Guardado");
      onGuardado(fila);
      setTimeout(() => setEstado(""), 1500);
    }
  }

  // Color del borde izquierdo segun resultado
  const borderColor =
    pts === 3 ? "border-l-lima" :
    pts === 1 ? "border-l-wc26-blue" :
    pts === 0 ? "border-l-wc26-red" :
    iniciado && !partido.finalizado ? "border-l-wc26-gold" :
    "border-l-cancha-600";

  return (
    <div className={`border-l-4 ${borderColor} bg-cancha-800 rounded-xl overflow-hidden hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200`}>
      {/* Header: fecha y grupo */}
      <div className="flex items-center justify-between bg-cancha-700/40 px-6 py-3">
        <span className="text-xs font-mono text-crema/40">{fmtFecha(partido.inicio)}</span>
        <span className="rounded bg-cancha-600/50 px-2 py-0.5 text-xs text-crema/60">
          {partido.fase ?? partido.grupo ?? ""}
        </span>
      </div>

      {/* Cuerpo: equipos y marcador */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-16 px-6 py-8 md:py-10">
        {/* Equipo local */}
        <div className="flex items-center gap-3 md:flex-row-reverse">
          <span className="text-2xl leading-none">{bandera(partido.equipo_local)}</span>
          <span className="text-xl font-bold text-crema md:text-right">
            {partido.equipo_local}
          </span>
        </div>

        {/* Scores */}
        {bloqueado ? (
          <div className="flex items-center gap-3">
            <span className="font-mono text-5xl font-bold text-lima">
              {prono?.goles_local ?? "–"}
            </span>
            <span className="text-cancha-600 text-3xl">:</span>
            <span className="font-mono text-5xl font-bold text-lima">
              {prono?.goles_visitante ?? "–"}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              className="w-16 h-16 bg-cancha-700 text-lima font-mono text-4xl font-bold text-center rounded-xl border-none outline-none focus:ring-4 focus:ring-lima/30 transition-all"
            />
            <span className="text-cancha-600 text-3xl">:</span>
            <input
              type="number"
              min={0}
              value={visita}
              onChange={(e) => setVisita(e.target.value)}
              className="w-16 h-16 bg-cancha-700 text-lima font-mono text-4xl font-bold text-center rounded-xl border-none outline-none focus:ring-4 focus:ring-lima/30 transition-all"
            />
          </div>
        )}

        {/* Equipo visitante */}
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none">{bandera(partido.equipo_visitante)}</span>
          <span className="text-xl font-bold text-crema">
            {partido.equipo_visitante}
          </span>
        </div>
      </div>

      {/* Footer segun estado */}
      {partido.finalizado && partido.goles_local_final != null ? (
        <div className="flex items-center justify-between bg-lima/5 border-t border-cancha-600/30 px-6 py-3">
          <span className="text-sm text-crema/60">
            Final: <strong className="text-crema">{partido.goles_local_final} &ndash; {partido.goles_visitante_final}</strong>
          </span>
          {pts != null ? (
            <span className={`rounded-full px-3 py-1 text-xs font-black ${
              pts === 3 ? "bg-lima text-carbon"            :
              pts === 1 ? "bg-wc26-blue/20 text-wc26-blue" :
                          "bg-wc26-red/20 text-wc26-red"
            }`}>
              {pts === 3 ? "Exacto" : pts === 1 ? "Resultado" : "Fallido"}&nbsp;&nbsp;{pts > 0 ? `+${pts}` : "0"} pt{pts === 1 ? "" : "s"}
            </span>
          ) : (
            <span className="text-xs text-crema/30">Sin pronostico</span>
          )}
        </div>
      ) : bloqueado ? (
        <div className="flex items-center justify-between bg-wc26-gold/5 border-t border-cancha-600/30 px-6 py-3">
          <span className="text-xs text-wc26-gold/70">Partido en curso</span>
          <span className="text-xs text-crema/30">Resultado pendiente</span>
        </div>
      ) : (
        <div className="flex items-center justify-end gap-4 border-t border-cancha-600/30 px-6 py-4">
          {msg && (
            <span className={`text-sm ${estado === "error" ? "text-wc26-red" : "text-lima"}`}>
              {msg}
            </span>
          )}
          <button
            onClick={guardar}
            disabled={estado === "guardando"}
            className="rounded-xl bg-lima px-8 py-3 font-bold text-carbon shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-60"
          >
            {estado === "guardando" ? "..." : prono ? "Actualizar" : "Guardar"}
          </button>
        </div>
      )}
    </div>
  );
}
