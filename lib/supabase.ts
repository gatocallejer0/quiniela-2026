import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// El sistema de login es "Nombre + PIN". Por debajo lo traducimos a un
// email/contraseña que entiende Supabase Auth.
//   nombre  -> slug -> "{slug}@quiniela.local"
//   pin     -> "{pin}{PEPPER}"  (el sufijo garantiza >= 6 caracteres)
const DOMINIO = "quiniela.app";
const PEPPER = "#QN2026"; // constante de la app; el usuario solo recuerda su PIN

export function nombreASlug(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function nombreAEmail(nombre: string): string {
  return `${nombreASlug(nombre)}@${DOMINIO}`;
}

export function pinAPassword(pin: string): string {
  return `${pin}${PEPPER}`;
}
