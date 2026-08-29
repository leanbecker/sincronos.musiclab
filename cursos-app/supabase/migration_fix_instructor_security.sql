-- =========================================================
-- Seguridad: antes, cualquier usuario autenticado podía crear
-- un curso (o auto-asignarse el rol 'instructor') llamando
-- directamente a la API de Supabase, sin pasar por la interfaz.
-- Esta migración cierra ambos huecos.
-- Ejecutar en el SQL Editor de Supabase.
-- =========================================================

-- 1) Crear/editar/borrar cursos ahora exige que el perfil sea instructor de verdad
drop policy if exists "Instructor crea sus cursos" on courses;
drop policy if exists "Instructor edita sus cursos" on courses;
drop policy if exists "Instructor borra sus cursos" on courses;

create policy "Instructor crea sus cursos" on courses for insert with check (
  instructor_id = auth.uid()
  and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'instructor')
);
create policy "Instructor edita sus cursos" on courses for update using (
  instructor_id = auth.uid()
  and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'instructor')
);
create policy "Instructor borra sus cursos" on courses for delete using (
  instructor_id = auth.uid()
  and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'instructor')
);

-- 2) Un usuario puede editar su nombre/avatar, pero no puede cambiarse el rol a sí mismo
drop policy if exists "Usuarios editan su propio perfil" on profiles;

create policy "Usuarios editan su propio perfil" on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from profiles where id = auth.uid()));
