'use client'

import { useState } from 'react'

export default function BuyButton({ courseId }: { courseId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'No se pudo iniciar la compra.')
        setLoading(false)
        return
      }

      window.location.href = data.checkoutUrl
    } catch {
      setError('Ocurrió un error de conexión.')
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-full bg-pine text-white px-6 py-3 hover:bg-pine-dark transition-colors disabled:opacity-60"
      >
        {loading ? 'Redirigiendo a Mercado Pago…' : 'Comprar con Mercado Pago'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
