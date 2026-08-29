'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    // Mensaje específico si la cuenta existe pero el email no fue confirmado
    if (error.message.toLowerCase().includes('email not confirmed')) {
      redirect(
        `/login?error=${encodeURIComponent(
          'Todavía no confirmaste tu email. Revisá tu casilla de correo.'
        )}`
      )
    }
    redirect(`/login?error=${encodeURIComponent('Email o contraseña incorrectos.')}`)
  }

  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: { full_name: formData.get('full_name') as string },
    },
  })

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  // El rol siempre arranca como 'student' (lo pone el trigger de la base).
  // Para dar de alta instructores se usa la ruta secreta /instructor/alta.

  // Si Supabase tiene activada la confirmación de email, signUp no crea sesión
  // todavía: hay que avisarle al usuario que revise su correo en vez de
  // mandarlo directo al dashboard (ahí rebotaría al login).
  if (!data.session) {
    redirect('/signup?confirmacion=pendiente')
  }

  redirect('/dashboard')
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/reset-password`,
  })

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/forgot-password?enviado=1')
}

