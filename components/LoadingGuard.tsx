"use client";

import { useAuth } from "@/lib/auth";

export function LoadingGuard({ children }: { children: React.ReactNode }) {
  const { cargando } = useAuth();

  if (cargando) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="animate-pulse font-mono text-sm tracking-widest text-crema/30 uppercase">
          Cargando&hellip;
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
