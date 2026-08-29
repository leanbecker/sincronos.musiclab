import Link from 'next/link'
import { forgotPassword } from '@/app/login/actions'

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; enviado?: string }>
}) {
  const { error, enviado } = await searchParams

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <Link href="/" className="font-display italic text-2xl text-ink">
            Aula
          </Link>
          <h1 className="font-display text-3xl mt-8 mb-3">Revisá tu email</h1>
          <p className="text-muted text-sm">
            Si ese email tiene una cuenta registrada, te mandamos un link para elegir una
            contraseña nueva.
          </p>
          <Link href="/login" className="inline-block mt-6 text-pine hover:underline text-sm">
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display italic text-2xl text-ink">
          Aula
        </Link>
        <h1 className="font-display text-3xl mt-8 mb-1">Recuperar contraseña</h1>
        <p className="text-muted text-sm mb-8">
          Te mandamos un link para elegir una contraseña nueva.
        </p>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
            {error}
          </p>
        )}

        <form action={forgotPassword} className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 outline-none focus:border-pine"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-pine text-white py-2.5 hover:bg-pine-dark transition-colors"
          >
            Mandar link de recuperación
          </button>
        </form>

        <p className="mt-6 text-sm text-muted">
          <Link href="/login" className="text-pine hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
