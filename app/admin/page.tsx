"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Partido, Perfil, Premio, PremioAdicional, Regla, PuntosAdicional } from "@/lib/types";

const TZ = "America/Guatemala";
function fmt(iso: string) {
  return new Intl.DateTimeFormat("es-GT", {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function Admin() {
  const { session, perfil, cargando } = useAuth();
  const router = useRouter();
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [partidosAbiertos, setPartidosAbiertos] = useState(false);
  const [usuarios, setUsuarios] = useState<Perfil[]>([]);
  const [pronosticosPorPartido, setPronosticosPorPartido] = useState<Record<number, Set<string>>>({});
  const [premios, setPremios] = useState<Premio[]>([]);
  const [adicionales, setAdicionales] = useState<PremioAdicional[]>([]);
  const [reglas, setReglas] = useState<Regla[]>([]);
  const [cargandoData, setCargandoData] = useState(true);
  const [pasadosAbiertos, setPasadosAbiertos] = useState(false);
  const [finalizadosAdminAbiertos, setFinalizadosAdminAbiertos] = useState(false);
  const [puntosAd, setPuntosAd] = useState<Record<string, number>>({});
  const [participacionAbierta, setParticipacionAbierta] = useState(false);
  const [usuariosAbiertos, setUsuariosAbiertos] = useState(false);
  const [puntosAdAbiertos, setPuntosAdAbiertos] = useState(false);
  const [reglasAbiertos, setReglasAbiertos] = useState(false);
  const [premiosAbiertos, setPremiosAbiertos] = useState(false);

  useEffect(() => {
    if (!cargando && (!session || !perfil?.es_admin)) router.replace("/partidos");
  }, [cargando, session, perfil, router]);

  async function recargarParticipacion() {
    const { data: pronos } = await supabase.from("pronosticos").select("usuario_id, partido_id");
    const mapa: Record<number, Set<string>> = {};
    (pronos as { usuario_id: string; partido_id: number }[] | null)?.forEach(({ usuario_id, partido_id }) => {
      if (!mapa[partido_id]) mapa[partido_id] = new Set();
      mapa[partido_id].add(usuario_id);
    });
    setPronosticosPorPartido(mapa);
  }

  useEffect(() => {
    if (!perfil?.es_admin) return;
    (async () => {
      const [{ data: ps }, { data: us }, { data: pronos }, { data: prs }, { data: ads }, { data: rgs }, { data: pts }] = await Promise.all([
        supabase.from("partidos").select("*").order("inicio", { ascending: true }),
        supabase.from("perfiles").select("*").order("nombre", { ascending: true }),
        supabase.from("pronosticos").select("usuario_id, partido_id"),
        supabase.from("premios").select("*").order("posicion", { ascending: true }),
        supabase.from("premios_adicionales").select("*").order("id", { ascending: true }),
        supabase.from("reglas").select("*").order("orden", { ascending: true }),
        supabase.from("puntos_adicionales").select("*"),
      ]);
      setPartidos((ps as Partido[]) ?? []);
      setUsuarios((us as Perfil[]) ?? []);
      // Mapa: partido_id -> Set de usuario_ids que ya pusieron pronóstico
      const mapa: Record<number, Set<string>> = {};
      (pronos as { usuario_id: string; partido_id: number }[] | null)?.forEach(({ usuario_id, partido_id }) => {
        if (!mapa[partido_id]) mapa[partido_id] = new Set();
        mapa[partido_id].add(usuario_id);
      });
      setPronosticosPorPartido(mapa);
      setPremios((prs as Premio[]) ?? []);
      setAdicionales((ads as PremioAdicional[]) ?? []);
      setReglas((rgs as Regla[]) ?? []);
      const mapapts: Record<string, number> = {};
      (pts as PuntosAdicional[] | null)?.forEach(({ usuario_id, puntos }) => { mapapts[usuario_id] = puntos; });
      setPuntosAd(mapapts);
      setCargandoData(false);
    })();
  }, [perfil]);

  if (cargando || !perfil?.es_admin) return null;

  const posicionLabel = (n: number) =>
    n === 1 ? "1er lugar" : n === 2 ? "2do lugar" : n === 3 ? "3er lugar" : `${n}o lugar`;

  const posicionColor = (n: number) =>
    n === 1 ? "bg-wc26-gold text-carbon"   :
    n === 2 ? "bg-wc26-blue text-carbon"   :
    n === 3 ? "bg-wc26-green text-white"   :
    "bg-cancha-700 text-crema/60";

  return (
    <div className="aparece space-y-10">

      {/* Resultados */}
      <section>
        <button
          onClick={() => setPartidosAbiertos((v) => !v)}
          className="mb-1 flex w-full items-center justify-between gap-3 text-left"
        >
          <h1 className="font-display text-5xl text-lima uppercase">Admin &middot; Resultados</h1>
          <span className="material-symbols-outlined text-3xl text-lima/50 transition-transform duration-200" style={{ transform: partidosAbiertos ? "rotate(0deg)" : "rotate(-90deg)" }}>
            expand_more
          </span>
        </button>
        {partidosAbiertos && (
          <>
            <p className="mb-6 text-sm text-crema/50">
              Carga el marcador final. Al marcar &ldquo;finalizado&rdquo; se calculan los puntos.
            </p>
            {cargandoData ? (
              <p className="text-crema/50">Cargando&hellip;</p>
            ) : (() => {
              const finalizados = partidos.filter((p) => p.finalizado);
              const noFinalizados = partidos.filter((p) => !p.finalizado);
              return (
                <div className="space-y-2">
                  {/* Finalizados colapsados */}
                  {finalizados.length > 0 && (
                    <div>
                      <button
                        onClick={() => setFinalizadosAdminAbiertos((v) => !v)}
                        className="mb-2 flex w-full items-center justify-between gap-2 rounded-xl border border-cancha-600/30 bg-cancha-800/50 px-4 py-2.5 text-left"
                      >
                        <span className="text-xs font-semibold text-crema/40">
                          {finalizados.length} partido{finalizados.length !== 1 ? "s" : ""} finalizado{finalizados.length !== 1 ? "s" : ""}
                        </span>
                        <span
                          className="material-symbols-outlined text-base text-crema/30 transition-transform duration-200"
                          style={{ transform: finalizadosAdminAbiertos ? "rotate(0deg)" : "rotate(-90deg)" }}
                        >
                          expand_more
                        </span>
                      </button>
                      {finalizadosAdminAbiertos && (
                        <div className="space-y-2 mb-2">
                          {finalizados.map((p) => (
                            <FilaAdmin
                              key={p.id}
                              partido={p}
                              usuarios={usuarios}
                              conProno={pronosticosPorPartido[p.id] ?? new Set()}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {/* No finalizados siempre visibles */}
                  {noFinalizados.map((p) => (
                    <FilaAdmin
                      key={p.id}
                      partido={p}
                      usuarios={usuarios}
                      conProno={pronosticosPorPartido[p.id] ?? new Set()}
                    />
                  ))}
                </div>
              );
            })()}
          </>
        )}
      </section>

      {/* Participación */}
      <section>
        <div className="mb-1 flex w-full items-center justify-between gap-3">
          <button
            onClick={() => setParticipacionAbierta((v) => !v)}
            className="flex flex-1 items-center justify-between gap-3 text-left"
          >
            <h2 className="font-display text-5xl text-lima uppercase">Participación</h2>
            <span className="material-symbols-outlined text-3xl text-lima/50 transition-transform duration-200" style={{ transform: participacionAbierta ? "rotate(0deg)" : "rotate(-90deg)" }}>
              expand_more
            </span>
          </button>
          <button
            onClick={recargarParticipacion}
            title="Actualizar participación"
            className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cancha-600 text-crema/40 transition hover:border-lima/50 hover:text-lima"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
          </button>
        </div>
        {participacionAbierta && (cargandoData ? (
          <p className="text-crema/50">Cargando&hellip;</p>
        ) : (() => {
          const pasados = partidos.filter((p) => p.finalizado);
          const proximos = partidos.filter((p) => !p.finalizado);
          return (
            <div className="space-y-2">
              {/* Partidos pasados colapsados */}
              {pasados.length > 0 && (
                <div>
                  <button
                    onClick={() => setPasadosAbiertos((v) => !v)}
                    className="mb-2 flex w-full items-center justify-between gap-2 rounded-xl border border-cancha-600/30 bg-cancha-800/50 px-4 py-2.5 text-left"
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
                    <div className="space-y-2">
                      {pasados.map((p) => (
                        <FilaParticipacion
                          key={p.id}
                          partido={p}
                          usuarios={usuarios}
                          conProno={pronosticosPorPartido[p.id] ?? new Set()}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Partidos actuales y próximos */}
              {proximos.map((p) => (
                <FilaParticipacion
                  key={p.id}
                  partido={p}
                  usuarios={usuarios}
                  conProno={pronosticosPorPartido[p.id] ?? new Set()}
                />
              ))}
              {proximos.length === 0 && pasados.length === 0 && (
                <p className="text-crema/40">Sin partidos.</p>
              )}
            </div>
          );
        })())}
      </section>

      {/* Usuarios */}
      <section>
        <button
          onClick={() => setUsuariosAbiertos((v) => !v)}
          className="mb-1 flex w-full items-center justify-between gap-3 text-left"
        >
          <h2 className="font-display text-5xl text-lima uppercase">Usuarios</h2>
          <span className="material-symbols-outlined text-3xl text-lima/50 transition-transform duration-200" style={{ transform: usuariosAbiertos ? "rotate(0deg)" : "rotate(-90deg)" }}>
            expand_more
          </span>
        </button>
        {usuariosAbiertos && (cargandoData ? (
          <p className="text-crema/50">Cargando&hellip;</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-cancha-600/30 bg-cancha-800">
            {usuarios.map((u, i) => (
              <FilaUsuario
                key={u.id}
                usuario={u}
                ultimo={i === usuarios.length - 1}
                onToggle={(actualizado) =>
                  setUsuarios((prev) =>
                    prev.map((x) => (x.id === actualizado.id ? actualizado : x))
                  )
                }
              />
            ))}
            {usuarios.length === 0 && (
              <p className="px-6 py-8 text-center text-crema/40">Sin usuarios.</p>
            )}
          </div>
        ))}
      </section>

      {/* Puntos adicionales */}
      <section>
        <button
          onClick={() => setPuntosAdAbiertos((v) => !v)}
          className="mb-1 flex w-full items-center justify-between gap-3 text-left"
        >
          <h2 className="font-display text-5xl text-lima uppercase">Puntos adicionales</h2>
          <span className="material-symbols-outlined text-3xl text-lima/50 transition-transform duration-200" style={{ transform: puntosAdAbiertos ? "rotate(0deg)" : "rotate(-90deg)" }}>
            expand_more
          </span>
        </button>
        {puntosAdAbiertos && (cargandoData ? (
          <p className="text-crema/50">Cargando&hellip;</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-cancha-600/30 bg-cancha-800">
            {usuarios.map((u, i) => (
              <FilaPuntosAd
                key={u.id}
                usuario={u}
                puntos={puntosAd[u.id] ?? 0}
                ultimo={i === usuarios.length - 1}
                onChange={(delta) => {
                  const actuales = puntosAd[u.id] ?? 0;
                  const nuevos = actuales + delta;
                  setPuntosAd((prev) => ({ ...prev, [u.id]: nuevos }));
                  supabase.from("puntos_adicionales")
                    .upsert({ usuario_id: u.id, puntos: nuevos }, { onConflict: "usuario_id" })
                    .select()
                    .then(({ data, error }) => { console.log("upsert puntos_adicionales:", { data, error }); });
                }}
              />
            ))}
            {usuarios.length === 0 && (
              <p className="px-6 py-8 text-center text-crema/40">Sin usuarios.</p>
            )}
          </div>
        ))}
      </section>

      {/* Reglas */}
      <section>
        <button
          onClick={() => setReglasAbiertos((v) => !v)}
          className="mb-1 flex w-full items-center justify-between gap-3 text-left"
        >
          <h2 className="font-display text-5xl text-lima uppercase">Reglas</h2>
          <span className="material-symbols-outlined text-3xl text-lima/50 transition-transform duration-200" style={{ transform: reglasAbiertos ? "rotate(0deg)" : "rotate(-90deg)" }}>
            expand_more
          </span>
        </button>
        {reglasAbiertos && (cargandoData ? (
          <p className="text-crema/50">Cargando&hellip;</p>
        ) : (
          <div className="space-y-2">
            {reglas.map((r) => (
              <FilaRegla
                key={r.id}
                regla={r}
                onActualizada={(actualizada) =>
                  setReglas((prev) =>
                    prev.map((x) => (x.id === actualizada.id ? actualizada : x))
                  )
                }
                onEliminada={(id) =>
                  setReglas((prev) => prev.filter((x) => x.id !== id))
                }
              />
            ))}
            <FormNuevaRegla
              onAgregada={(nueva) =>
                setReglas((prev) =>
                  [...prev, nueva].sort((a, b) => a.orden - b.orden)
                )
              }
            />
          </div>
        ))}
      </section>

      {/* Premios */}
      <section>
        <button
          onClick={() => setPremiosAbiertos((v) => !v)}
          className="mb-1 flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-3">
            <h2 className="font-display text-5xl text-lima uppercase">Premios</h2>
            <div className="flex overflow-hidden rounded-full" style={{ width: 72 }}>
              <div className="h-1 flex-1 bg-wc26-gold" />
              <div className="h-1 flex-1 bg-wc26-blue" />
              <div className="h-1 flex-1 bg-wc26-green" />
            </div>
          </div>
          <span className="material-symbols-outlined text-3xl text-lima/50 transition-transform duration-200" style={{ transform: premiosAbiertos ? "rotate(0deg)" : "rotate(-90deg)" }}>
            expand_more
          </span>
        </button>
        {premiosAbiertos && (cargandoData ? (
          <p className="text-crema/50">Cargando&hellip;</p>
        ) : (
          <div className="space-y-2">
            {premios.map((pr) => (
              <FilaPremio
                key={pr.id}
                premio={pr}
                posicionLabel={posicionLabel}
                posicionColor={posicionColor}
                onActualizado={(actualizado) =>
                  setPremios((prev) =>
                    prev.map((p) => (p.id === actualizado.id ? actualizado : p))
                  )
                }
                onEliminado={(id) =>
                  setPremios((prev) => prev.filter((p) => p.id !== id))
                }
              />
            ))}
            <FormNuevoPremio
              posicionesUsadas={premios.map((p) => p.posicion)}
              posicionLabel={posicionLabel}
              posicionColor={posicionColor}
              onAgregado={(nuevo) =>
                setPremios((prev) =>
                  [...prev, nuevo].sort((a, b) => a.posicion - b.posicion)
                )
              }
            />

            {/* Premios adicionales */}
            <div className="mt-6">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-crema/40">
                Premios adicionales
              </p>
              <p className="mb-3 text-xs text-crema/30">Por participación · sin lugar específico.</p>
              <div className="space-y-2">
                {adicionales.map((a) => (
                  <FilaAdicional
                    key={a.id}
                    adicional={a}
                    onActualizado={(act) =>
                      setAdicionales((prev) =>
                        prev.map((x) => (x.id === act.id ? act : x))
                      )
                    }
                    onEliminado={(id) =>
                      setAdicionales((prev) => prev.filter((x) => x.id !== id))
                    }
                  />
                ))}
                <FormNuevoAdicional
                  onAgregado={(nuevo) =>
                    setAdicionales((prev) => [...prev, nuevo])
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

// Premios

function FilaPremio({
  premio,
  posicionLabel,
  posicionColor,
  onActualizado,
  onEliminado,
}: {
  premio: Premio;
  posicionLabel: (n: number) => string;
  posicionColor: (n: number) => string;
  onActualizado: (p: Premio) => void;
  onEliminado: (id: number) => void;
}) {
  const [desc, setDesc] = useState(premio.descripcion);
  const [valor, setValor] = useState(premio.valor ?? "");
  const [msg, setMsg] = useState("");

  async function guardar() {
    if (!desc.trim()) return;
    setMsg("...");
    const { error } = await supabase
      .from("premios")
      .update({ descripcion: desc.trim(), valor: valor.trim() || null })
      .eq("id", premio.id);
    if (error) { setMsg("Error"); return; }
    setMsg("Guardado");
    onActualizado({ ...premio, descripcion: desc.trim(), valor: valor.trim() || null });
    setTimeout(() => setMsg(""), 1500);
  }

  async function eliminar() {
    if (!confirm("Eliminar este premio?")) return;
    const { error } = await supabase.from("premios").delete().eq("id", premio.id);
    if (!error) onEliminado(premio.id!);
  }

  return (
    <div className="rounded-xl border border-cancha-600/40 bg-cancha-800 p-3">
      <div className="mb-3">
        <span className={`rounded-full px-3 py-0.5 text-xs font-black ${posicionColor(premio.posicion)}`}>
          {posicionLabel(premio.posicion)}
        </span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Descripcion del premio"
          className="flex-[2] rounded-lg border border-cancha-600 bg-cancha-700 px-3 py-1.5 text-sm text-crema outline-none focus:border-lima"
        />
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Valor / monto (opcional)"
          className="flex-1 rounded-lg border border-cancha-600 bg-cancha-700 px-3 py-1.5 text-sm text-crema outline-none focus:border-lima"
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        {msg ? (
          <span className="text-xs text-lima">{msg}</span>
        ) : (
          <button
            onClick={eliminar}
            className="text-xs text-wc26-red/60 hover:text-wc26-red"
          >
            Eliminar
          </button>
        )}
        <button
          onClick={guardar}
          className="rounded-lg bg-lima px-4 py-1.5 text-sm font-bold text-carbon hover:bg-limaSoft"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

function FormNuevoPremio({
  posicionesUsadas,
  posicionLabel,
  posicionColor,
  onAgregado,
}: {
  posicionesUsadas: number[];
  posicionLabel: (n: number) => string;
  posicionColor: (n: number) => string;
  onAgregado: (p: Premio) => void;
}) {
  const opciones = [1, 2, 3, 4, 5, 6].filter((n) => !posicionesUsadas.includes(n));
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState(opciones[0] ?? 1);
  const [desc, setDesc] = useState("");
  const [valor, setValor] = useState("");
  const [msg, setMsg] = useState("");

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="mt-1 w-full rounded-xl border border-dashed border-cancha-600 py-3 text-sm text-crema/40 transition hover:border-lima/50 hover:text-crema/70"
      >
        + Agregar premio
      </button>
    );
  }

  async function agregar() {
    if (!desc.trim()) { setMsg("Escribe una descripcion."); return; }
    if (posicionesUsadas.includes(posicion)) { setMsg("Esa posicion ya tiene un premio."); return; }
    setMsg("...");
    const { data, error } = await supabase
      .from("premios")
      .insert({ posicion, descripcion: desc.trim(), valor: valor.trim() || null })
      .select()
      .single();
    if (error) { setMsg("Error: " + error.message); return; }
    onAgregado(data as Premio);
    setDesc("");
    setValor("");
    setMsg("");
    setAbierto(false);
  }

  return (
    <div className="rounded-xl border border-cancha-600/40 bg-cancha-800 p-3">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-crema/50">
        Nuevo premio
      </p>
      <div className="mb-3 flex flex-wrap gap-1">
        {opciones.map((n) => (
          <button
            key={n}
            onClick={() => setPosicion(n)}
            className={`rounded-full px-3 py-0.5 text-xs font-black transition ${
              posicion === n
                ? posicionColor(n)
                : "border border-cancha-600 text-crema/50 hover:text-crema"
            }`}
          >
            {posicionLabel(n)}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Ej. Q500 en efectivo, Cena familiar..."
          className="flex-[2] rounded-lg border border-cancha-600 bg-cancha-700 px-3 py-1.5 text-sm text-crema outline-none focus:border-lima"
        />
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Valor / monto (opcional)"
          className="flex-1 rounded-lg border border-cancha-600 bg-cancha-700 px-3 py-1.5 text-sm text-crema outline-none focus:border-lima"
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setAbierto(false); setMsg(""); }}
            className="text-xs text-crema/40 hover:text-crema/70"
          >
            Cancelar
          </button>
          {msg && <span className="text-xs text-wc26-red">{msg}</span>}
        </div>
        <button
          onClick={agregar}
          className="rounded-lg bg-lima px-4 py-1.5 text-sm font-bold text-carbon hover:bg-limaSoft"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}

// Usuarios

function FilaUsuario({
  usuario,
  ultimo,
  onToggle,
}: {
  usuario: Perfil;
  ultimo: boolean;
  onToggle: (u: Perfil) => void;
}) {
  const [cargando, setCargando] = useState(false);

  async function toggle() {
    setCargando(true);
    const { error } = await supabase
      .from("perfiles")
      .update({ pagado: !usuario.pagado })
      .eq("id", usuario.id);
    if (!error) onToggle({ ...usuario, pagado: !usuario.pagado });
    setCargando(false);
  }

  return (
    <div className={`flex items-center justify-between px-6 py-4 ${!ultimo ? "border-b border-cancha-600/30" : ""}`}>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-crema">{usuario.nombre}</span>
        {usuario.es_admin && (
          <span className="rounded-full bg-lima/20 px-2 py-0.5 text-[10px] font-bold text-lima">Admin</span>
        )}
      </div>
      <button
        onClick={toggle}
        disabled={cargando}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${
          usuario.pagado
            ? "bg-lima/20 text-lima hover:bg-lima/30"
            : "border border-cancha-600 text-crema/40 hover:border-lima/40 hover:text-crema/70"
        }`}
      >
        {usuario.pagado && (
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
        )}
        {usuario.pagado ? "Pagado" : "Pendiente"}
      </button>
    </div>
  );
}

// Puntos adicionales

function FilaPuntosAd({
  usuario,
  puntos,
  ultimo,
  onChange,
}: {
  usuario: Perfil;
  puntos: number;
  ultimo: boolean;
  onChange: (delta: number) => void;
}) {
  return (
    <div className={`flex items-center justify-between px-6 py-4 ${!ultimo ? "border-b border-cancha-600/30" : ""}`}>
      <span className="text-sm font-semibold text-crema">{usuario.nombre}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-cancha-600 text-crema/50 transition hover:border-wc26-red/60 hover:text-wc26-red"
        >
          <span className="material-symbols-outlined text-base">remove</span>
        </button>
        <span className="w-8 text-center font-mono text-lg font-bold text-lima tabular">{puntos}</span>
        <button
          onClick={() => onChange(1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-cancha-600 text-crema/50 transition hover:border-lima/60 hover:text-lima"
        >
          <span className="material-symbols-outlined text-base">add</span>
        </button>
      </div>
    </div>
  );
}

// Premios adicionales

function FilaAdicional({
  adicional,
  onActualizado,
  onEliminado,
}: {
  adicional: PremioAdicional;
  onActualizado: (a: PremioAdicional) => void;
  onEliminado: (id: number) => void;
}) {
  const [desc, setDesc] = useState(adicional.descripcion);
  const [valor, setValor] = useState(adicional.valor ?? "");
  const [msg, setMsg] = useState("");

  async function guardar() {
    if (!desc.trim()) return;
    setMsg("...");
    const { error } = await supabase
      .from("premios_adicionales")
      .update({ descripcion: desc.trim(), valor: valor.trim() || null })
      .eq("id", adicional.id);
    if (error) { setMsg("Error"); return; }
    setMsg("Guardado");
    onActualizado({ ...adicional, descripcion: desc.trim(), valor: valor.trim() || null });
    setTimeout(() => setMsg(""), 1500);
  }

  async function eliminar() {
    if (!confirm("Eliminar este premio adicional?")) return;
    const { error } = await supabase.from("premios_adicionales").delete().eq("id", adicional.id);
    if (!error) onEliminado(adicional.id!);
  }

  return (
    <div className="rounded-xl border border-cancha-600/40 bg-cancha-800 p-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Ej. Premio participación"
          className="flex-[2] rounded-lg border border-cancha-600 bg-cancha-700 px-3 py-1.5 text-sm text-crema outline-none focus:border-lima"
        />
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Valor / monto (opcional)"
          className="flex-1 rounded-lg border border-cancha-600 bg-cancha-700 px-3 py-1.5 text-sm text-crema outline-none focus:border-lima"
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        {msg ? (
          <span className="text-xs text-lima">{msg}</span>
        ) : (
          <button onClick={eliminar} className="text-xs text-wc26-red/60 hover:text-wc26-red">
            Eliminar
          </button>
        )}
        <button
          onClick={guardar}
          className="rounded-lg bg-lima px-4 py-1.5 text-sm font-bold text-carbon hover:bg-limaSoft"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

function FormNuevoAdicional({ onAgregado }: { onAgregado: (a: PremioAdicional) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [desc, setDesc] = useState("");
  const [valor, setValor] = useState("");
  const [msg, setMsg] = useState("");

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="mt-1 w-full rounded-xl border border-dashed border-cancha-600 py-3 text-sm text-crema/40 transition hover:border-lima/50 hover:text-crema/70"
      >
        + Agregar premio adicional
      </button>
    );
  }

  async function agregar() {
    if (!desc.trim()) { setMsg("Escribe una descripción."); return; }
    setMsg("...");
    const { data, error } = await supabase
      .from("premios_adicionales")
      .insert({ descripcion: desc.trim(), valor: valor.trim() || null })
      .select()
      .single();
    if (error) { setMsg("Error: " + error.message); return; }
    onAgregado(data as PremioAdicional);
    setDesc("");
    setValor("");
    setMsg("");
    setAbierto(false);
  }

  return (
    <div className="rounded-xl border border-cancha-600/40 bg-cancha-800 p-3">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-crema/50">
        Nuevo premio adicional
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Ej. Premio participación, Mejor quiniela día 1..."
          className="flex-[2] rounded-lg border border-cancha-600 bg-cancha-700 px-3 py-1.5 text-sm text-crema outline-none focus:border-lima"
        />
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Valor / monto (opcional)"
          className="flex-1 rounded-lg border border-cancha-600 bg-cancha-700 px-3 py-1.5 text-sm text-crema outline-none focus:border-lima"
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setAbierto(false); setMsg(""); }}
            className="text-xs text-crema/40 hover:text-crema/70"
          >
            Cancelar
          </button>
          {msg && <span className="text-xs text-wc26-red">{msg}</span>}
        </div>
        <button
          onClick={agregar}
          className="rounded-lg bg-lima px-4 py-1.5 text-sm font-bold text-carbon hover:bg-limaSoft"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}

// Reglas

function FilaRegla({
  regla,
  onActualizada,
  onEliminada,
}: {
  regla: Regla;
  onActualizada: (r: Regla) => void;
  onEliminada: (id: number) => void;
}) {
  const [titulo, setTitulo] = useState(regla.titulo);
  const [descripcion, setDescripcion] = useState(regla.descripcion ?? "");
  const [orden, setOrden] = useState(String(regla.orden));
  const [msg, setMsg] = useState("");

  async function guardar() {
    if (!titulo.trim()) return;
    setMsg("...");
    const { error } = await supabase
      .from("reglas")
      .update({ titulo: titulo.trim(), descripcion: descripcion.trim() || null, orden: Number(orden) })
      .eq("id", regla.id);
    if (error) { setMsg("Error"); return; }
    setMsg("Guardado");
    onActualizada({ ...regla, titulo: titulo.trim(), descripcion: descripcion.trim() || null, orden: Number(orden) });
    setTimeout(() => setMsg(""), 1500);
  }

  async function eliminar() {
    if (!confirm("Eliminar esta regla?")) return;
    const { error } = await supabase.from("reglas").delete().eq("id", regla.id);
    if (!error) onEliminada(regla.id!);
  }

  return (
    <div className="rounded-xl border border-cancha-600/40 bg-cancha-800 p-3">
      <div className="mb-3 flex items-center gap-2">
        <input
          type="number"
          value={orden}
          onChange={(e) => setOrden(e.target.value)}
          className="w-14 rounded-lg border border-cancha-600 bg-cancha-700 px-2 py-1 text-center text-xs font-bold text-crema/70 outline-none focus:border-lima"
          placeholder="#"
        />
        <span className="text-xs text-crema/40">orden</span>
      </div>
      <div className="flex flex-col gap-2">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título de la regla"
          className="rounded-lg border border-cancha-600 bg-cancha-700 px-3 py-1.5 text-sm font-semibold text-crema outline-none focus:border-lima"
        />
        <input
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Descripción (opcional)"
          className="rounded-lg border border-cancha-600 bg-cancha-700 px-3 py-1.5 text-sm text-crema outline-none focus:border-lima"
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        {msg ? (
          <span className="text-xs text-lima">{msg}</span>
        ) : (
          <button
            onClick={eliminar}
            className="text-xs text-wc26-red/60 hover:text-wc26-red"
          >
            Eliminar
          </button>
        )}
        <button
          onClick={guardar}
          className="rounded-lg bg-lima px-4 py-1.5 text-sm font-bold text-carbon hover:bg-limaSoft"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

function FormNuevaRegla({ onAgregada }: { onAgregada: (r: Regla) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [orden, setOrden] = useState("1");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [msg, setMsg] = useState("");

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="mt-1 w-full rounded-xl border border-dashed border-cancha-600 py-3 text-sm text-crema/40 transition hover:border-lima/50 hover:text-crema/70"
      >
        + Agregar regla
      </button>
    );
  }

  async function agregar() {
    if (!titulo.trim()) { setMsg("Escribe un título."); return; }
    setMsg("...");
    const { data, error } = await supabase
      .from("reglas")
      .insert({ orden: Number(orden), titulo: titulo.trim(), descripcion: descripcion.trim() || null })
      .select()
      .single();
    if (error) { setMsg("Error: " + error.message); return; }
    onAgregada(data as Regla);
    setTitulo("");
    setDescripcion("");
    setOrden("1");
    setMsg("");
    setAbierto(false);
  }

  return (
    <div className="rounded-xl border border-cancha-600/40 bg-cancha-800 p-3">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-crema/50">
        Nueva regla
      </p>
      <div className="mb-2 flex items-center gap-2">
        <input
          type="number"
          value={orden}
          onChange={(e) => setOrden(e.target.value)}
          className="w-14 rounded-lg border border-cancha-600 bg-cancha-700 px-2 py-1 text-center text-xs font-bold text-crema/70 outline-none focus:border-lima"
          placeholder="#"
        />
        <span className="text-xs text-crema/40">orden de aparición</span>
      </div>
      <div className="flex flex-col gap-2">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ej. Fecha límite de pronósticos"
          className="rounded-lg border border-cancha-600 bg-cancha-700 px-3 py-1.5 text-sm font-semibold text-crema outline-none focus:border-lima"
        />
        <input
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Descripción (opcional)"
          className="rounded-lg border border-cancha-600 bg-cancha-700 px-3 py-1.5 text-sm text-crema outline-none focus:border-lima"
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setAbierto(false); setMsg(""); }}
            className="text-xs text-crema/40 hover:text-crema/70"
          >
            Cancelar
          </button>
          {msg && <span className="text-xs text-wc26-red">{msg}</span>}
        </div>
        <button
          onClick={agregar}
          className="rounded-lg bg-lima px-4 py-1.5 text-sm font-bold text-carbon hover:bg-limaSoft"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}

// Participación

function FilaParticipacion({ partido, usuarios, conProno }: {
  partido: Partido;
  usuarios: Perfil[];
  conProno: Set<string>;
}) {
  const [ver, setVer] = useState(false);
  const sinProno = usuarios.filter((u) => !conProno.has(u.id));
  const conPronoLista = usuarios.filter((u) => conProno.has(u.id));
  const bloqueado = new Date(partido.inicio).getTime() - 10 * 60 * 1000 <= Date.now();

  return (
    <div className="rounded-xl border border-cancha-600/40 bg-cancha-800 p-3">
      <button
        onClick={() => setVer((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-crema/30">{fmt(partido.inicio)}{bloqueado && <span className="ml-2 text-wc26-red/70">bloqueado</span>}</p>
          <p className="truncate text-sm font-semibold text-crema">
            {partido.equipo_local} vs {partido.equipo_visitante}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-lima font-semibold">{conPronoLista.length}/{usuarios.length}</span>
          {sinProno.length > 0 && (
            <span className="rounded-full bg-wc26-red/10 px-2 py-0.5 text-[10px] font-bold text-wc26-red">
              {sinProno.length} falta{sinProno.length !== 1 ? "n" : ""}
            </span>
          )}
          <span className="material-symbols-outlined text-base text-crema/30 transition-transform duration-200" style={{ transform: ver ? "rotate(0deg)" : "rotate(-90deg)" }}>
            expand_more
          </span>
        </div>
      </button>

      {ver && (
        <div className="mt-2 border-t border-cancha-600/30 pt-2 flex flex-wrap gap-1.5">
          {conPronoLista.map((u) => (
            <span key={u.id} className="flex items-center gap-1 rounded-full bg-lima/10 px-2.5 py-0.5 text-xs font-semibold text-lima">
              ✓ {u.nombre}
            </span>
          ))}
          {sinProno.map((u) => (
            <span key={u.id} className="flex items-center gap-1 rounded-full bg-wc26-red/10 px-2.5 py-0.5 text-xs font-semibold text-wc26-red">
              ✗ {u.nombre}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Resultados

function FilaAdmin({ partido, usuarios, conProno }: {
  partido: Partido;
  usuarios: Perfil[];
  conProno: Set<string>;
}) {
  const [gl, setGl] = useState(
    partido.goles_local_final != null ? String(partido.goles_local_final) : ""
  );
  const [gv, setGv] = useState(
    partido.goles_visitante_final != null
      ? String(partido.goles_visitante_final)
      : ""
  );
  const [fin, setFin] = useState(partido.finalizado);
  const [msg, setMsg] = useState("");
  async function guardar() {
    setMsg("...");
    const { error } = await supabase
      .from("partidos")
      .update({
        goles_local_final: gl === "" ? null : Number(gl),
        goles_visitante_final: gv === "" ? null : Number(gv),
        finalizado: fin,
      })
      .eq("id", partido.id);
    setMsg(error ? "Error: " + error.message : "Guardado");
    if (!error) setTimeout(() => setMsg(""), 1500);
  }

  return (
    <div className="rounded-xl border border-cancha-600/40 bg-cancha-800 p-3">
      <div className="mb-2 text-xs text-crema/40">{fmt(partido.inicio)}</div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-right text-sm font-semibold text-crema">
          {partido.equipo_local}
        </span>
        <input
          type="number"
          min={0}
          value={gl}
          onChange={(e) => setGl(e.target.value)}
          className="w-12 rounded-lg border border-cancha-600 bg-cancha-700 py-1.5 text-center font-bold text-crema outline-none focus:border-lima"
        />
        <span className="text-crema/40">:</span>
        <input
          type="number"
          min={0}
          value={gv}
          onChange={(e) => setGv(e.target.value)}
          className="w-12 rounded-lg border border-cancha-600 bg-cancha-700 py-1.5 text-center font-bold text-crema outline-none focus:border-lima"
        />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-crema">
          {partido.equipo_visitante}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-crema/70">
          <input
            type="checkbox"
            checked={fin}
            onChange={(e) => setFin(e.target.checked)}
            className="h-4 w-4 accent-lima"
          />
          Finalizado
        </label>
        <div className="flex items-center gap-3">
          {msg && <span className="text-xs text-lima">{msg}</span>}
          <button
            onClick={guardar}
            className="rounded-lg bg-lima px-4 py-1.5 text-sm font-bold text-carbon hover:bg-limaSoft"
          >
            Guardar
          </button>
        </div>
      </div>

    </div>
  );
}
