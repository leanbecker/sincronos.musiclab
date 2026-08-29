import Link from 'next/link'
import { login } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display italic text-2xl text-ink">
          Aula
        </Link>
        <h1 className="font-display text-3xl mt-8 mb-1">Bienvenido de nuevo</h1>
        <p className="text-muted text-sm mb-8">Ingresá para ver tus cursos.</p>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
            {error}
          </p>
        )}

        <form action={login} className="space-y-4">
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
              className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 outline-none focus:border-pine"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-pine text-white py-2.5 hover:bg-pine-dark transition-colors"
          >
            Iniciar sesión
          </button>
        </form>

        <p className="mt-4 text-sm">
          <Link href="/forgot-password" className="text-pine hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>

        <p className="mt-2 text-sm text-muted">
          ¿No tenés cuenta?{' '}
          <Link href="/signup" className="text-pine hover:underline">
            Creá una
          </Link>
        </p>
      </div>
    </div>
  )
}
