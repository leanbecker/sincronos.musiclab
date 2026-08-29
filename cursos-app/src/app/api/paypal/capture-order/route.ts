import { NextRequest, NextResponse } from 'next/server'
import { paypalFetch } from '@/lib/paypal'
import { createAdminClient } from '@/lib/supabase/admin'

// PayPal redirige acá (GET) después de que el alumno aprueba el pago.
// Docs: https://developer.paypal.com/docs/checkout/standard/integrate/
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token') // = order id de PayPal
  const enrollmentId = url.searchParams.get('enrollmentId')
  const courseId = url.searchParams.get('courseId')

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!

  if (!token || !enrollmentId || !courseId) {
    return NextResponse.redirect(`${siteUrl}/`)
  }

  const supabase = createAdminClient()

  try {
    const captureRes = await paypalFetch(`/v2/checkout/orders/${token}/capture`, {
      method: 'POST',
    })

    const captureData = await captureRes.json()

    const isCompleted =
      captureRes.ok &&
      (captureData.status === 'COMPLETED' ||
        captureData.purchase_units?.[0]?.payments?.captures?.[0]?.status === 'COMPLETED')

    if (isCompleted) {
      const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null

      await supabase
        .from('enrollments')
        .update({ status: 'active', paypal_capture_id: captureId })
        .eq('id', enrollmentId)

      return NextResponse.redirect(`${siteUrl}/cursos/${courseId}?compra=exitosa`)
    }

    console.error('Captura de PayPal no completada', captureData)
    await supabase.from('enrollments').update({ status: 'cancelled' }).eq('id', enrollmentId)
    return NextResponse.redirect(`${siteUrl}/cursos/${courseId}?compra=fallida`)
  } catch (err) {
    console.error('Error capturando pago de PayPal', err)
    return NextResponse.redirect(`${siteUrl}/cursos/${courseId}?compra=fallida`)
  }
}
