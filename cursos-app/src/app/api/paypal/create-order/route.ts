import { NextRequest, NextResponse } from 'next/server'
import { paypalFetch } from '@/lib/paypal'
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
    .select('id, title, price_usd, is_published')
    .eq('id', courseId)
    .single()

  if (courseError || !course || !course.is_published) {
    return NextResponse.json({ error: 'Curso no encontrado.' }, { status: 404 })
  }

  if (!course.price_usd || Number(course.price_usd) <= 0) {
    return NextResponse.json(
      { error: 'Este curso no tiene precio en dólares configurado.' },
      { status: 400 }
    )
  }

  const { data: existing } = await supabase
    .from('enrollments')
    .select('id, status')
    .eq('student_id', user.id)
    .eq('course_id', course.id)
    .maybeSingle()

  if (existing?.status === 'active') {
    return NextResponse.json({ error: 'Ya tenés acceso a este curso.' }, { status: 400 })
  }

  const { data: enrollment, error: enrollmentError } = await supabase
    .from('enrollments')
    .upsert(
      {
        id: existing?.id,
        student_id: user.id,
        course_id: course.id,
        status: 'pending',
        payment_provider: 'paypal',
      },
      { onConflict: 'student_id,course_id' }
    )
    .select('id')
    .single()

  if (enrollmentError || !enrollment) {
    return NextResponse.json({ error: 'No se pudo iniciar la compra.' }, { status: 500 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!

  const orderRes = await paypalFetch('/v2/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: enrollment.id,
          description: course.title,
          amount: {
            currency_code: 'USD',
            value: Number(course.price_usd).toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: 'Aula',
        user_action: 'PAY_NOW',
        return_url: `${siteUrl}/api/paypal/capture-order?enrollmentId=${enrollment.id}&courseId=${course.id}`,
        cancel_url: `${siteUrl}/cursos/${course.id}?compra=fallida`,
      },
    }),
  })

  if (!orderRes.ok) {
    console.error('Error creando orden de PayPal', await orderRes.text())
    return NextResponse.json({ error: 'No se pudo iniciar el pago con PayPal.' }, { status: 500 })
  }

  const order = await orderRes.json()

  await supabase.from('enrollments').update({ paypal_order_id: order.id }).eq('id', enrollment.id)

  const approveLink = order.links?.find(
    (link: { rel: string; href: string }) => link.rel === 'approve' || link.rel === 'payer-action'
  )?.href

  if (!approveLink) {
    return NextResponse.json({ error: 'PayPal no devolvió un link de pago.' }, { status: 500 })
  }

  return NextResponse.json({ checkoutUrl: approveLink })
}
