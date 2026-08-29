'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function signupInstructor(formData: FormData) {
  const clave = formData.get('clave') as string

  // La clave nunca se expone al cliente: solo existe en el servidor.
  if (!process.env.INSTRUCTOR_SIGNUP_SECRET || clave !== process.env.INSTRUCTOR_SIGNUP_SECRET) {
    redirect(`/instructor/alta?error=${encodeURIComponent('Clave incorrecta.')}`)
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: { full_name: formData.get('full_name') as string },
    },
  })

  if (error || !data.user) {
    redirect(`/instructor/alta?error=${encodeURIComponent(error?.message ?? 'No se pudo crear la cuenta.')}`)
  }

  // Recién acá, ya validada la clave, usamos permisos de administrador
  // (service_role) para asignar el rol instructor — el usuario común nunca
  // puede hacer esto por sí mismo, ni siquiera editando su propio perfil.
  const admin = createAdminClient()
  await admin.from('profiles').update({ role: 'instructor' }).eq('id', data.user!.id)

  if (!data.session) {
    redirect('/instructor/alta?confirmacion=pendiente')
  }

  redirect('/instructor')
}
