"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

const EXCLUIDOS = ["Adrian007"];

type Respuesta = { asiste: boolean; acompanantes: number };

function ModalEncuesta({
  inicial,
  onGuardado,
  onCerrar,
}: {
  inicial?: Respuesta;
  onGuardado: (r: Respuesta) => void;
  onCerrar?: () => void;
}) {
  const { session } = useAuth();
  const [asiste, setAsiste] = useState<boolean | null>(inicial?.asiste ?? null);
  const [acompanantes, setAcompanantes] = useState(String(inicial?.acompanantes ?? 0));
  const [enviando, setEnviando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  async function enviar() {
    if (asiste === null || !session) return;
    setEnviando(true);
    const acomp = asiste ? Math.max(0, parseInt(acompanantes) || 0) : 0;
    const { error } = await supabase.from("encuesta_beraca").upsert(
      { usuario_id: session.user.id, asiste, acompanantes: acomp },
      { onConflict: "usuario_id" }
    );
    setEnviando(false);
    if (!error) {
      setGuardado(true);
      setTimeout(() => onGuardado({ asiste, acompanantes: acomp }), 1400);
    }
  }

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-cancha-600/60 bg-cancha-900 shadow-2xl">

        {/* Encabezado */}
        <div className="bg-gradient-to-r from-wc26-red/20 to-wc26-blue/20 border-b border-cancha-600/40 px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏠⚽</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-wc26-red/80">Convivencia</p>
                <h2 className="font-display text-2xl uppercase text-crema">
                  Final en Beraca <span className="text-lg text-crema/50">(San Lucas Sac)</span>
                </h2>
              </div>
            </div>
            {onCerrar && !guardado && (
              <button
                onClick={onCerrar}
                className="shrink-0 rounded-full p-1 text-crema/30 transition hover:text-crema/70"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Cuerpo */}
        <div className="px-6 py-5 space-y-5">

          {!inicial && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3">
              <span className="text-lg mt-0.5">⚠️</span>
              <p className="text-sm text-amber-300/90 leading-relaxed">
                <span className="font-bold">Es importante que respondas esta encuesta.</span>
                {" "}Necesitamos organizarnos para la comida y actividades de la convivencia.
              </p>
            </div>
          )}

          {!guardado ? (
            <>
              <p className="text-base font-semibold text-crema">
                ¿Vas a ver la Final del Mundial en Beraca (San Lucas Sac)?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setAsiste(true)}
                  className={`flex-1 rounded-xl border py-3 text-sm font-bold transition ${
                    asiste === true
                      ? "border-lima bg-lima/20 text-lima"
                      : "border-cancha-600 text-crema/60 hover:border-lima/50 hover:text-crema"
                  }`}
                >
                  ✅ Sí, voy
                </button>
                <button
                  onClick={() => { setAsiste(false); setAcompanantes("0"); }}
                  className={`flex-1 rounded-xl border py-3 text-sm font-bold transition ${
                    asiste === false
                      ? "border-wc26-red bg-wc26-red/10 text-wc26-red"
                      : "border-cancha-600 text-crema/60 hover:border-wc26-red/50 hover:text-crema"
                  }`}
                >
                  ❌ No puedo
                </button>
              </div>

              {asiste === true && (
                <div className="rounded-xl border border-cancha-600/50 bg-cancha-800 px-4 py-4 space-y-3">
                  <p className="text-sm font-semibold text-crema">¿Cuántas personas te acompañan?</p>
                  <p className="text-xs text-crema/40">No te incluyas a ti mismo, solo a quienes te acompañan.</p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setAcompanantes(String(Math.max(0, (parseInt(acompanantes) || 0) - 1)))}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-cancha-600 text-crema/50 transition hover:border-wc26-red/60 hover:text-wc26-red"
                    >
                      <span className="material-symbols-outlined text-base">remove</span>
                    </button>
                    <span className="w-10 text-center font-mono text-2xl font-bold text-lima tabular">
                      {acompanantes}
                    </span>
                    <button
                      onClick={() => setAcompanantes(String((parseInt(acompanantes) || 0) + 1))}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-cancha-600 text-crema/50 transition hover:border-lima/60 hover:text-lima"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                    </button>
                    <span className="text-sm text-crema/50">
                      {parseInt(acompanantes) === 0
                        ? "Solo tú"
                        : parseInt(acompanantes) === 1
                        ? "1 persona más"
                        : `${acompanantes} personas más`}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={enviar}
                disabled={asiste === null || enviando}
                className="w-full rounded-xl bg-lima py-3 text-sm font-bold text-carbon transition hover:bg-limaSoft disabled:opacity-40"
              >
                {enviando ? "Guardando..." : inicial ? "Actualizar respuesta" : "Confirmar respuesta"}
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <span className="text-4xl">{asiste ? "🎉" : "👍"}</span>
              <p className="text-center text-base font-semibold text-lima">
                {asiste ? "¡Listo! Respuesta actualizada." : "Gracias por responder."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

// Popup inicial para quienes no han respondido
export function EncuestaBeraca() {
  const { session, perfil, cargando } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (cargando || !session || !perfil) return;
    if (EXCLUIDOS.includes(perfil.nombre)) return;
    supabase
      .from("encuesta_beraca")
      .select("usuario_id")
      .eq("usuario_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => { if (!data) setVisible(true); });
  }, [cargando, session, perfil]);

  if (!visible) return null;
  return (
    <ModalEncuesta
      onGuardado={() => setVisible(false)}
    />
  );
}

// Botón pequeño para editar la respuesta (para la página de partidos)
export function BotonEditarEncuesta() {
  const { session, perfil, cargando } = useAuth();
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (cargando || !session || !perfil) return;
    if (EXCLUIDOS.includes(perfil.nombre)) return;
    supabase
      .from("encuesta_beraca")
      .select("asiste, acompanantes")
      .eq("usuario_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setRespuesta(data as Respuesta);
      });
  }, [cargando, session, perfil]);

  if (!respuesta) return null;

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="flex items-center gap-1.5 rounded-full border border-cancha-600/50 bg-cancha-800/60 px-3 py-1 text-xs text-crema/50 transition hover:border-wc26-blue/40 hover:text-crema/80"
      >
        <span className="text-sm">🏠</span>
        <span>
          Beraca:{" "}
          <span className={`font-semibold ${respuesta.asiste ? "text-lima" : "text-wc26-red/80"}`}>
            {respuesta.asiste
              ? respuesta.acompanantes === 0
                ? "Voy solo"
                : `Voy con ${respuesta.acompanantes}`
              : "No voy"}
          </span>
        </span>
        <span className="material-symbols-outlined text-xs">edit</span>
      </button>

      {abierto && (
        <ModalEncuesta
          inicial={respuesta}
          onGuardado={(nueva) => { setRespuesta(nueva); setAbierto(false); }}
          onCerrar={() => setAbierto(false)}
        />
      )}
    </>
  );
}
