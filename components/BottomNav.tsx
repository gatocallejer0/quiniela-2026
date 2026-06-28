"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

export function BottomNav() {
  const { session, perfil } = useAuth();
  const path = usePathname();

  if (!session) return null;

  const items = [
    { href: "/partidos", label: "Partidos", icon: "sports_soccer" },
    { href: "/llaves",   label: "Llaves",   icon: "account_tree"  },
    { href: "/tabla",    label: "Tabla",    icon: "leaderboard"   },
    { href: "/premios",  label: "Premios",  icon: "emoji_events"  },
    { href: "/reglas",   label: "Reglas",   icon: "gavel"         },
    ...(perfil?.es_admin ? [{ href: "/admin", label: "Admin", icon: "settings" }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-cancha-600/50 bg-cancha-900 md:hidden">
      <div className="flex">
        {items.map((item) => {
          const activo = path === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 px-2 py-3 transition ${
                activo
                  ? "bg-lima/20 text-lima"
                  : "text-crema/40 hover:text-crema/70"
              }`}
            >
              <span className="material-symbols-outlined text-2xl">{item.icon}</span>
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
