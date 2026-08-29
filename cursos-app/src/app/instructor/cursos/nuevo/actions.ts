'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function createCourse(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const priceArs = Number(formData.get('price_ars') || 0)

  const baseSlug = slugify(title)
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`

  const { data, error } = await supabase
    .from('courses')
    .insert({
      instructor_id: user.id,
      title,
      description,
      price_ars: priceArs,
      slug,
    })
    .select('id')
    .single()

  if (error || !data) {
    redirect(`/instructor/cursos/nuevo?error=${encodeURIComponent('No se pudo crear el curso.')}`)
  }

  redirect(`/instructor/cursos/${data.id}`)
}
