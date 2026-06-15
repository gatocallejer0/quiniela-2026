"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, nombreAEmail, pinAPassword } from "./supabase";
import type { Perfil } from "./types";

type AuthCtx = {
  session: Session | null;
  perfil: Perfil | null;
  cargando: boolean;
  registrar: (nombre: string, pin: string) => Promise<void>;
  entrar: (nombre: string, pin: string) => Promise<void>;
  salir: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);

  async function cargarPerfil(userId: string) {
    try {
      const { data } = await supabase
        .from("perfiles")
        .select("id, nombre, es_admin, pagado")
        .eq("id", userId)
        .single();
      setPerfil((data as Perfil) ?? null);
    } catch (err) {
      console.error("cargarPerfil falló:", err);
    }
  }

  // Inicializa la sesión y registra el listener de cambios de auth.
  // El callback de onAuthStateChange es SÍNCRONO a propósito: llamar a
  // supabase.from() dentro del callback retiene el Web Lock de auth en
  // supabase-js v2 y congela todas las queries posteriores indefinidamente.
  useEffect(() => {
    const timeout = setTimeout(() => setCargando(false), 5000);

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await cargarPerfil(data.session.user.id);
    }).catch(() => {}).finally(() => { clearTimeout(timeout); setCargando(false); });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) setPerfil(null);
      setCargando(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Carga el perfil cada vez que cambia la sesión.
  // Separado del listener para no hacer queries de Supabase dentro del Web Lock.
  useEffect(() => {
    if (session) cargarPerfil(session.user.id);
  }, [session]);

  async function registrar(nombre: string, pin: string) {
    const email = nombreAEmail(nombre);
    const password = pinAPassword(pin);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre: nombre.trim() } },
    });
    if (error) throw new Error(traducirError(error.message));
    // El perfil lo crea automáticamente un trigger en la base de datos.
    // Iniciamos sesión por si signUp no dejó sesión activa.
    await supabase.auth.signInWithPassword({ email, password });
  }

  async function entrar(nombre: string, pin: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: nombreAEmail(nombre),
      password: pinAPassword(pin),
    });
    if (error) throw new Error(traducirError(error.message));
  }

  async function salir() {
    await supabase.auth.signOut();
  }

  return (
    <Ctx.Provider
      value={{ session, perfil, cargando, registrar, entrar, salir }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth fuera de AuthProvider");
  return c;
}

function traducirError(msg: string): string {
  if (msg.includes("Invalid login credentials"))
    return "Nombre o PIN incorrecto.";
  if (msg.includes("already registered") || msg.includes("already exists"))
    return "Ese nombre ya está registrado. Usa Entrar.";
  if (msg.includes("Password should be"))
    return "El PIN es demasiado corto (usa 4 dígitos o más).";
  if (msg.includes("rate limit"))
    return "Demasiados intentos. Espera unos minutos y vuelve a probar.";
  return msg;
}
