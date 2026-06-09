import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Quiniela Familiar · Mundial 2026",
  description: "Pronosticos de la familia para el Mundial 2026",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <Nav />
          <main className="mx-auto w-full max-w-[1280px] px-4 pb-24 pt-20 md:px-12">
            {children}
          </main>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
