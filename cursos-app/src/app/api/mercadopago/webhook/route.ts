import { NextRequest, NextResponse } from 'next/server'
import { Payment } from 'mercadopago'
import { mpClient } from '@/lib/mercadopago'
import { createAdminClient } from '@/lib/supabase/admin'

// Mercado Pago llama a esta URL cada vez que cambia el estado de un pago.
// Documentación: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/notifications/webhooks
export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const topic = url.searchParams.get('type') ?? url.searchParams.get('topic')
  const paymentId = url.searchParams.get('data.id') ?? url.searchParams.get('id')

  if (topic !== 'payment' || !paymentId) {
    // Ignoramos otro tipo de notificaciones (merchant_order, etc.)
    return NextResponse.json({ received: true })
  }

  try {
    const payment = await new Payment(mpClient).get({ id: paymentId })
    const enrollmentId = payment.external_reference

    if (!enrollmentId) {
      return NextResponse.json({ received: true })
    }

    const supabase = createAdminClient()

    if (payment.status === 'approved') {
      await supabase
        .from('enrollments')
        .update({
          status: 'active',
          mp_payment_id: String(payment.id),
        })
        .eq('id', enrollmentId)
    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      await supabase
        .from('enrollments')
        .update({ status: 'cancelled', mp_payment_id: String(payment.id) })
        .eq('id', enrollmentId)
    }
    // Si está "pending" o "in_process" no hacemos nada: esperamos la próxima notificación.

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Error procesando webhook de Mercado Pago', err)
    // Devolvemos 200 igual para que Mercado Pago no reintente en loop por errores nuestros de lectura
    return NextResponse.json({ received: true })
  }
}
