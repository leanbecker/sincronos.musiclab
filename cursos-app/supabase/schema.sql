-- =========================================================
-- Esquema para la plataforma de cursos
-- Ejecutar en el SQL Editor de tu proyecto Supabase
-- =========================================================

-- Perfil de cada usuario (se crea automáticamente al registrarse)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'student' check (role in ('student', 'instructor', 'admin')),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Cursos
create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  slug text not null unique,
  description text,
  cover_image_url text,
  price_ars numeric(12,2) not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lecciones (videos) dentro de un curso
create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  description text,
  video_url text, -- URL del video en Bunny.net (HLS) u otro proveedor
  duration_seconds integer default 0,
  position integer not null default 0, -- orden de la lección dentro del curso
  is_preview boolean not null default false, -- se puede ver sin comprar
  created_at timestamptz not null default now()
);

-- Inscripciones (quién compró/tiene acceso a qué curso)
create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'cancelled')),
  mp_payment_id text, -- id de pago de Mercado Pago
  mp_preference_id text,
  amount_paid_ars numeric(12,2),
  created_at timestamptz not null default now(),
  unique (student_id, course_id)
);

-- Progreso por lección
create table if not exists lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (student_id, lesson_id)
);

-- =========================================================
-- Trigger: crear perfil automáticamente al registrarse
-- =========================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'student');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- Row Level Security
-- =========================================================
alter table profiles enable row level security;
alter table courses enable row level security;
alter table lessons enable row level security;
alter table enrollments enable row level security;
alter table lesson_progress enable row level security;

-- Perfiles: cada uno ve/edita el suyo, todos pueden ver perfiles públicos básicos
create policy "Perfiles visibles para todos" on profiles for select using (true);
create policy "Usuarios editan su propio perfil" on profiles for update using (auth.uid() = id);

-- Cursos: publicados son visibles para todos; el instructor ve y edita los propios (publicados o no)
create policy "Cursos publicados son públicos" on courses for select using (is_published = true or instructor_id = auth.uid());
create policy "Instructor crea sus cursos" on courses for insert with check (instructor_id = auth.uid());
create policy "Instructor edita sus cursos" on courses for update using (instructor_id = auth.uid());
create policy "Instructor borra sus cursos" on courses for delete using (instructor_id = auth.uid());

-- Lecciones: visibles si el curso es público (preview) o si el alumno está inscripto o es el instructor
create policy "Preview visible para todos" on lessons for select using (
  is_preview = true
  or exists (select 1 from courses c where c.id = course_id and c.instructor_id = auth.uid())
  or exists (
    select 1 from enrollments e
    where e.course_id = lessons.course_id and e.student_id = auth.uid() and e.status = 'active'
  )
);
create policy "Instructor administra lecciones" on lessons for all using (
  exists (select 1 from courses c where c.id = course_id and c.instructor_id = auth.uid())
);

-- Inscripciones: el alumno ve las propias, el instructor ve las de sus cursos
create policy "Alumno ve sus inscripciones" on enrollments for select using (
  student_id = auth.uid()
  or exists (select 1 from courses c where c.id = course_id and c.instructor_id = auth.uid())
);
create policy "Alumno crea su inscripción" on enrollments for insert with check (student_id = auth.uid());

-- Progreso: cada alumno ve y actualiza el propio
create policy "Alumno ve su progreso" on lesson_progress for select using (student_id = auth.uid());
create policy "Alumno actualiza su progreso" on lesson_progress for all using (student_id = auth.uid());
