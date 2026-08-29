import Link from 'next/link'
import { signup } from './actions'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; confirmacion?: string }>
}) {
  const { error, confirmacion } = await searchParams

  if (confirmacion === 'pendiente') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm text-center">
          <Link href="/" className="font-display italic text-2xl text-ink">
            Aula
          </Link>
          <h1 className="font-display text-3xl mt-8 mb-3">Revisá tu email</h1>
          <p className="text-muted text-sm">
            Te mandamos un link de confirmación. Hacé clic ahí para activar tu cuenta y después
            iniciá sesión normalmente.
          </p>
          <Link
            href="/login"
            className="inline-block mt-6 rounded-full bg-pine text-white px-6 py-2.5 text-sm hover:bg-pine-dark transition-colors"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display italic text-2xl text-ink">
          Aula
        </Link>
        <h1 className="font-display text-3xl mt-8 mb-1">Creá tu cuenta</h1>
        <p className="text-muted text-sm mb-8">Empezá a aprender hoy mismo.</p>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
            {error}
          </p>
        )}

        <form action={signup} className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5" htmlFor="full_name">
              Nombre completo
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 outline-none focus:border-pine"
            />
          </div>
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
          <div>
            <label className="block text-sm mb-1.5" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 outline-none focus:border-pine"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-pine text-white py-2.5 hover:bg-pine-dark transition-colors"
          >
            Crear cuenta
          </button>
        </form>

        <p className="mt-6 text-sm text-muted">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-pine hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
