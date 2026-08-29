'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { uploadToBucket, deleteFromBucket } from '@/lib/storage'

export async function markLessonComplete(courseId: string, lessonId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase.from('lesson_progress').upsert(
    {
      student_id: user.id,
      lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString(),
    },
    { onConflict: 'student_id,lesson_id' }
  )

  revalidatePath(`/aprender/${courseId}/${lessonId}`)
  revalidatePath('/dashboard')
}

export async function submitActivity(
  courseId: string,
  lessonId: string,
  activityId: string,
  formData: FormData
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const file = formData.get('video') as File
  if (!file || file.size === 0) {
    redirect(
      `/aprender/${courseId}/${lessonId}?error=${encodeURIComponent('Elegí un video para subir.')}`
    )
  }

  // Si ya había una entrega previa (por ejemplo "necesita corrección"), la reemplazamos
  const { data: existing } = await supabase
    .from('activity_submissions')
    .select('id, video_path')
    .eq('activity_id', activityId)
    .eq('student_id', user.id)
    .maybeSingle()

  const ext = file.name.split('.').pop()
  const path = `${user.id}/${activityId}-${Date.now()}.${ext}`

  await uploadToBucket('submissions', path, file)

  if (existing) {
    await deleteFromBucket('submissions', existing.video_path)
    await supabase
      .from('activity_submissions')
      .update({
        video_path: path,
        status: 'pending',
        feedback: null,
        submitted_at: new Date().toISOString(),
        reviewed_at: null,
      })
      .eq('id', existing.id)
  } else {
    await supabase.from('activity_submissions').insert({
      activity_id: activityId,
      student_id: user.id,
      video_path: path,
      status: 'pending',
    })
  }

  revalidatePath(`/aprender/${courseId}/${lessonId}`)
}

export async function addNote(courseId: string, lessonId: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const content = formData.get('content') as string
  if (!content?.trim()) return

  await supabase.from('lesson_notes').insert({
    lesson_id: lessonId,
    student_id: user.id, // el hilo es siempre "del alumno" (el instructor también puede escribir acá, ver /instructor/revisiones)
    author_id: user.id,
    content,
  })

  revalidatePath(`/aprender/${courseId}/${lessonId}`)
}
