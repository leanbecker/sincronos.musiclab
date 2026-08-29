'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function assertOwner(courseId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: course } = await supabase
    .from('courses')
    .select('id, instructor_id')
    .eq('id', courseId)
    .single()

  if (!course || course.instructor_id !== user.id) {
    redirect('/instructor')
  }
  return supabase
}

export async function updateCourse(courseId: string, formData: FormData) {
  const supabase = await assertOwner(courseId)

  await supabase
    .from('courses')
    .update({
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      price_ars: Number(formData.get('price_ars') || 0),
      price_usd: formData.get('price_usd') ? Number(formData.get('price_usd')) : null,
      cover_image_url: (formData.get('cover_image_url') as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId)

  revalidatePath(`/instructor/cursos/${courseId}`)
}

export async function togglePublish(courseId: string, publish: boolean) {
  const supabase = await assertOwner(courseId)
  await supabase.from('courses').update({ is_published: publish }).eq('id', courseId)
  revalidatePath(`/instructor/cursos/${courseId}`)
}

export async function addLesson(courseId: string, formData: FormData) {
  const supabase = await assertOwner(courseId)

  const { count } = await supabase
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId)

  await supabase.from('lessons').insert({
    course_id: courseId,
    title: formData.get('title') as string,
    video_url: formData.get('video_url') as string,
    duration_seconds: Number(formData.get('duration_seconds') || 0),
    is_preview: formData.get('is_preview') === 'on',
    position: count ?? 0,
  })

  revalidatePath(`/instructor/cursos/${courseId}`)
}

export async function deleteLesson(courseId: string, lessonId: string) {
  const supabase = await assertOwner(courseId)
  await supabase.from('lessons').delete().eq('id', lessonId)
  revalidatePath(`/instructor/cursos/${courseId}`)
}
