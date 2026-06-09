# Quiniela Familiar · Mundial 2026 ⚽

App web para que la familia pronostique los marcadores del Mundial 2026.

- **Puntos:** 3 = marcador exacto · 1 = acierta el resultado (gana/empata/pierde) · 0 = falla.
- **Login:** nombre + PIN (sencillo, sin emails).
- **Bloqueo:** cada partido se cierra automáticamente a su hora de inicio (UTC-6 Guatemala).
- **Stack:** Next.js + Tailwind (Vercel) + Supabase (Postgres + Auth). Todo en plan gratis.

---

## 1. Crear el proyecto en Supabase

1. Entra a https://supabase.com y crea un proyecto nuevo (plan Free).
2. En **SQL Editor**, pega TODO el contenido de `supabase/schema.sql` y dale **Run**.
3. **IMPORTANTE — desactivar confirmación de email:**
   ve a **Authentication → Sign In / Providers → Email** y **apaga** *"Confirm email"*.
   (Usamos emails internos tipo `nombre@quiniela.local`, así que no hay buzón que confirmar.)
4. En **Project Settings → API** copia dos valores que usarás luego:
   - `Project URL`
   - `anon public` key

## 2. Cargar el calendario de partidos

**Opción A — datos de ejemplo (para probar ya):**
pega `supabase/seed-ejemplo.sql` en el SQL Editor y dale Run.

**Opción B — calendario real desde tu `.ics`:**
```bash
node scripts/parse-ics.mjs ruta/a/tu/calendario.ics > supabase/seed.sql
```
Luego pega el contenido de `supabase/seed.sql` en el SQL Editor y dale Run.

## 3. Probar en local

```bash
cp .env.local.example .env.local      # y pega tu URL + anon key
npm install
npm run dev                            # http://localhost:3000
```

Crea tu cuenta (nombre + PIN). Para volverte admin, en el SQL Editor:
```sql
update perfiles set es_admin = true where nombre = 'TuNombre';
```
Recarga y verás la pestaña **Admin** para cargar resultados.

## 4. Desplegar gratis en Vercel

1. Sube este proyecto a un repo de GitHub.
2. En https://vercel.com → **New Project** → importa el repo.
3. En **Environment Variables** agrega:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Deploy.** Listo: comparte el link `tuapp.vercel.app` con la familia.

---

## Cómo funciona la seguridad

- Las reglas (RLS) viven en Supabase, no en el navegador: aunque alguien manipule
  la app, **no puede** pronosticar un partido ya empezado ni ver los pronósticos
  ajenos antes del pitido inicial.
- La `anon key` es pública por diseño; lo que protege los datos son las políticas RLS.
- Solo las cuentas con `es_admin = true` pueden cargar resultados.

## Notas

- Los partidos de eliminación con equipos aún sin definir (ej. "Ganador A vs 2º B")
  el parser los incluirá si vienen como "X vs Y"; si solo dicen "Final" sin equipos,
  cárgalos a mano cuando se definan (puedes hacer `update partidos ...` o agregar una
  pantalla de admin para crearlos).
- ¿PIN olvidado? Como admin puedes resetearlo desde Supabase
  (**Authentication → Users**) o crear de nuevo el perfil.
