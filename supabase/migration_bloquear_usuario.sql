-- Bloquear usuario Adrian007 (a5e1f109-4d88-4a88-b832-3347febee786)
-- 1. Banear en Supabase Auth — rechaza el login directamente
update auth.users
  set banned_until = 'infinity'
  where id = 'a5e1f109-4d88-4a88-b832-3347febee786';

-- 2. Agregar columna bloqueado a perfiles (doble seguro a nivel de app)
alter table perfiles add column if not exists bloqueado boolean not null default false;

-- 3. Marcar el perfil
update perfiles
  set bloqueado = true
  where id = 'a5e1f109-4d88-4a88-b832-3347febee786';
