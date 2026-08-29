import { NextRequest, NextResponse } from 'next/server'
import { Preference } from 'mercadopago'
import { mpClient } from '@/lib/mercadopago'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { courseId } = await request.json()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Tenés que iniciar sesión para comprar.' }, { status: 401 })
  }

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, price_ars, is_published')
    .eq('id', courseId)
    .single()

  if (courseError || !course || !course.is_published) {
    return NextResponse.json({ error: 'Curso no encontrado.' }, { status: 404 })
  }

  // Evita comprar dos veces el mismo curso
  const { data: existing } = await supabase
    .from('enrollments')
    .select('id, status')
    .eq('student_id', user.id)
    .eq('course_id', course.id)
    .maybeSingle()

  if (existing?.status === 'active') {
    return NextResponse.json({ error: 'Ya tenés acceso a este curso.' }, { status: 400 })
  }

  // Crea (o reutiliza) la inscripción pendiente
  const { data: enrollment, error: enrollmentError } = await supabase
    .from('enrollments')
    .upsert(
      {
        id: existing?.id,
        student_id: user.id,
        course_id: course.id,
        status: 'pending',
        amount_paid_ars: course.price_ars,
      },
      { onConflict: 'student_id,course_id' }
    )
    .select('id')
    .single()

  if (enrollmentError || !enrollment) {
    return NextResponse.json({ error: 'No se pudo iniciar la compra.' }, { status: 500 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!

  const preference = await new Preference(mpClient).create({
    body: {
      items: [
        {
          id: course.id,
          title: course.title,
          quantity: 1,
          unit_price: Number(course.price_ars),
          currency_id: 'ARS',
        },
      ],
      external_reference: enrollment.id,
      back_urls: {
        success: `${siteUrl}/cursos/${course.id}?compra=exitosa`,
        failure: `${siteUrl}/cursos/${course.id}?compra=fallida`,
        pending: `${siteUrl}/cursos/${course.id}?compra=pendiente`,
      },
      auto_return: 'approved',
      notification_url: `${siteUrl}/api/mercadopago/webhook`,
    },
  })

  // Guarda el id de preferencia para poder cruzarlo después
  await supabase
    .from('enrollments')
    .update({ mp_preference_id: preference.id })
    .eq('id', enrollment.id)

  return NextResponse.json({ checkoutUrl: preference.init_point })
}
