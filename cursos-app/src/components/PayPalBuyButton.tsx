'use client'

import { useState } from 'react'

export default function PayPalBuyButton({ courseId }: { courseId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/paypal/create-order', {
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
        className="rounded-full border-2 border-ink text-ink px-6 py-3 hover:bg-ink hover:text-white transition-colors disabled:opacity-60"
      >
        {loading ? 'Redirigiendo a PayPal…' : 'Pagar en USD con PayPal'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
