"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export function Nav() {
  const { session, perfil, salir } = useAuth();
  const path = usePathname();
  const router = useRouter();
  if (!session) return null;

  const link = (href: string, txt: string) => {
    const activo = path === href;
    return (
      <Link
        href={href}
        className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
          activo
            ? "bg-lima text-carbon"
            : "text-crema/60 hover:text-crema"
        }`}
      >
        {txt}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-20 bg-cancha-900">
      {/* Franja tricolor We Are 26 */}
      <div className="flex h-0.5">
        <div className="flex-1 bg-wc26-red" />
        <div className="flex-1 bg-wc26-blue" />
        <div className="flex-1 bg-wc26-green" />
      </div>
      <div className="border-b border-cancha-600/40">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-2 px-4 py-3">
          <Link href="/partidos" className="font-display text-xl leading-none text-lima">
            QUINIELA <span className="text-crema/70">26</span>
          </Link>
          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {link("/partidos", "Partidos")}
            {link("/llaves", "Llaves")}
            {link("/tabla", "Tabla")}
            {link("/premios", "Premios")}
            {link("/reglas", "Reglas")}
            {perfil?.es_admin && link("/admin", "Admin")}
          </nav>
          <button
            onClick={async () => { await salir(); router.replace("/"); }}
            className="text-sm text-crema/60 transition hover:text-crema"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
