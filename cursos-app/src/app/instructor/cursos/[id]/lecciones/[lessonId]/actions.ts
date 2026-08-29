'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { uploadToBucket, deleteFromBucket } from '@/lib/storage'

async function assertLessonOwner(lessonId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, course_id, courses(instructor_id)')
    .eq('id', lessonId)
    .single()

  const instructorId = (lesson?.courses as unknown as { instructor_id: string } | null)
    ?.instructor_id

  if (!lesson || instructorId !== user.id) {
    redirect('/instructor')
  }
  return { supabase, courseId: lesson.course_id as string }
}

// ---------------------------------------------------------
// Bloques de contenido (texto, partitura, audio, imagen)
// ---------------------------------------------------------

export async function addTextBlock(lessonId: string, formData: FormData) {
  const { supabase, courseId } = await assertLessonOwner(lessonId)

  const { count } = await supabase
    .from('lesson_blocks')
    .select('id', { count: 'exact', head: true })
    .eq('lesson_id', lessonId)

  await supabase.from('lesson_blocks').insert({
    lesson_id: lessonId,
    type: 'text',
    title: (formData.get('title') as string) || null,
    content: formData.get('content') as string,
    position: count ?? 0,
  })

  revalidatePath(`/instructor/cursos/${courseId}/lecciones/${lessonId}`)
}

export async function addFileBlock(
  lessonId: string,
  type: 'sheet_music' | 'audio' | 'image',
  formData: FormData
) {
  const { supabase, courseId } = await assertLessonOwner(lessonId)

  const file = formData.get('file') as File
  if (!file || file.size === 0) {
    redirect(
      `/instructor/cursos/${courseId}/lecciones/${lessonId}?error=${encodeURIComponent(
        'Elegí un archivo.'
      )}`
    )
  }

  const ext = file.name.split('.').pop()
  const path = `${lessonId}/${type}-${Date.now()}.${ext}`

  await uploadToBucket('lesson-media', path, file)

  const { count } = await supabase
    .from('lesson_blocks')
    .select('id', { count: 'exact', head: true })
    .eq('lesson_id', lessonId)

  await supabase.from('lesson_blocks').insert({
    lesson_id: lessonId,
    type,
    title: (formData.get('title') as string) || null,
    content: path,
    position: count ?? 0,
  })

  revalidatePath(`/instructor/cursos/${courseId}/lecciones/${lessonId}`)
}

export async function deleteBlock(lessonId: string, blockId: string) {
  const { supabase, courseId } = await assertLessonOwner(lessonId)

  const { data: block } = await supabase
    .from('lesson_blocks')
    .select('type, content')
    .eq('id', blockId)
    .single()

  await supabase.from('lesson_blocks').delete().eq('id', blockId)

  if (block && block.type !== 'text') {
    await deleteFromBucket('lesson-media', block.content)
  }

  revalidatePath(`/instructor/cursos/${courseId}/lecciones/${lessonId}`)
}

// ---------------------------------------------------------
// Actividades
// ---------------------------------------------------------

export async function addActivity(lessonId: string, formData: FormData) {
  const { supabase, courseId } = await assertLessonOwner(lessonId)

  const { count } = await supabase
    .from('lesson_activities')
    .select('id', { count: 'exact', head: true })
    .eq('lesson_id', lessonId)

  await supabase.from('lesson_activities').insert({
    lesson_id: lessonId,
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    is_required: formData.get('is_required') === 'on',
    position: count ?? 0,
  })

  revalidatePath(`/instructor/cursos/${courseId}/lecciones/${lessonId}`)
}

export async function deleteActivity(lessonId: string, activityId: string) {
  const { supabase, courseId } = await assertLessonOwner(lessonId)
  await supabase.from('lesson_activities').delete().eq('id', activityId)
  revalidatePath(`/instructor/cursos/${courseId}/lecciones/${lessonId}`)
}
