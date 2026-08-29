-- =========================================================
-- Estructura de contenido de las lecciones:
--   - lesson_blocks: bloques de contenido en orden (texto, partitura, audio, imagen)
--   - lesson_activities: actividades/ejercicios de la lección (obligatorias u opcionales)
--   - activity_submissions: video que sube el alumno resolviendo una actividad, y corrección del instructor
--   - lesson_notes: notas/comentarios privados entre el alumno y el instructor, por lección
-- Ejecutar en el SQL Editor de Supabase.
-- =========================================================

-- ---------------------------------------------------------
-- Bloques de contenido de una lección
-- ---------------------------------------------------------
create table if not exists lesson_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  type text not null check (type in ('text', 'sheet_music', 'audio', 'image')),
  title text,
  -- 'text'  -> contenido en markdown
  -- otros   -> path dentro del bucket de storage 'lesson-media'
  content text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- Actividades / ejercicios de una lección
-- ---------------------------------------------------------
create table if not exists lesson_activities (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  title text not null,
  description text,
  is_required boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- Entregas de los alumnos (video resolviendo la actividad)
-- ---------------------------------------------------------
create table if not exists activity_submissions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references lesson_activities(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  -- path dentro del bucket de storage privado 'submissions'
  video_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'needs_revision')),
  feedback text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (activity_id, student_id)
);

-- ---------------------------------------------------------
-- Notas privadas por lección (hilo entre el alumno y el instructor)
-- ---------------------------------------------------------
create table if not exists lesson_notes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade, -- de qué alumno es el hilo
  author_id uuid not null references profiles(id) on delete cascade,  -- quién escribió (alumno o instructor)
  content text not null,
  created_at timestamptz not null default now()
);

-- =========================================================
-- Row Level Security
-- =========================================================
alter table lesson_blocks enable row level security;
alter table lesson_activities enable row level security;
alter table activity_submissions enable row level security;
alter table lesson_notes enable row level security;

-- Bloques y actividades: visibles bajo las mismas reglas que las lecciones
-- (vista previa pública, instructor dueño, o alumno inscripto activo)
create policy "Ver bloques si hay acceso a la lección" on lesson_blocks for select using (
  exists (
    select 1 from lessons l
    join courses c on c.id = l.course_id
    where l.id = lesson_id
      and (
        l.is_preview = true
        or c.instructor_id = auth.uid()
        or exists (
          select 1 from enrollments e
          where e.course_id = c.id and e.student_id = auth.uid() and e.status = 'active'
        )
      )
  )
);
create policy "Instructor administra bloques" on lesson_blocks for all using (
  exists (
    select 1 from lessons l join courses c on c.id = l.course_id
    where l.id = lesson_id and c.instructor_id = auth.uid()
  )
);

create policy "Ver actividades si hay acceso a la lección" on lesson_activities for select using (
  exists (
    select 1 from lessons l
    join courses c on c.id = l.course_id
    where l.id = lesson_id
      and (
        c.instructor_id = auth.uid()
        or exists (
          select 1 from enrollments e
          where e.course_id = c.id and e.student_id = auth.uid() and e.status = 'active'
        )
      )
  )
);
create policy "Instructor administra actividades" on lesson_activities for all using (
  exists (
    select 1 from lessons l join courses c on c.id = l.course_id
    where l.id = lesson_id and c.instructor_id = auth.uid()
  )
);

-- Entregas: el alumno ve y crea las propias; el instructor del curso ve y corrige todas
create policy "Alumno ve sus entregas" on activity_submissions for select using (
  student_id = auth.uid()
  or exists (
    select 1 from lesson_activities la
    join lessons l on l.id = la.lesson_id
    join courses c on c.id = l.course_id
    where la.id = activity_id and c.instructor_id = auth.uid()
  )
);
create policy "Alumno crea su entrega" on activity_submissions for insert with check (student_id = auth.uid());
create policy "Alumno actualiza su entrega pendiente" on activity_submissions for update using (
  student_id = auth.uid() and status = 'pending'
) with check (student_id = auth.uid());
create policy "Instructor corrige entregas de sus cursos" on activity_submissions for update using (
  exists (
    select 1 from lesson_activities la
    join lessons l on l.id = la.lesson_id
    join courses c on c.id = l.course_id
    where la.id = activity_id and c.instructor_id = auth.uid()
  )
);

-- Notas: el alumno ve/escribe las propias; el instructor del curso ve y responde las de sus alumnos
create policy "Ver notas del propio hilo" on lesson_notes for select using (
  student_id = auth.uid()
  or exists (
    select 1 from lessons l join courses c on c.id = l.course_id
    where l.id = lesson_id and c.instructor_id = auth.uid()
  )
);
create policy "Escribir en el propio hilo" on lesson_notes for insert with check (
  author_id = auth.uid()
  and (
    student_id = auth.uid()
    or exists (
      select 1 from lessons l join courses c on c.id = l.course_id
      where l.id = lesson_id and c.instructor_id = auth.uid()
    )
  )
);

-- =========================================================
-- Storage: buckets privados
-- =========================================================
insert into storage.buckets (id, name, public)
values ('lesson-media', 'lesson-media', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do nothing;

-- lesson-media: mismo criterio que lesson_blocks (accedido vía URL firmada desde el server)
create policy "Instructor sube contenido de lección" on storage.objects for insert
  with check (bucket_id = 'lesson-media' and auth.role() = 'authenticated');
create policy "Instructor borra contenido de lección" on storage.objects for delete
  using (bucket_id = 'lesson-media' and auth.role() = 'authenticated');

-- submissions: el alumno sube su propio video (carpeta = su propio user id)
create policy "Alumno sube su entrega" on storage.objects for insert
  with check (
    bucket_id = 'submissions'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
