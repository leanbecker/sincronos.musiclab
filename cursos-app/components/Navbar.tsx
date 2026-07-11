import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export default async function Navbar() {
  const session = await getCurrentUser()

  return (
    <header className="border-b border-line bg-paper/95 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-display italic text-2xl text-ink tracking-tight">
          Aula
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          {session ? (
            <>
              {session.profile?.role === 'instructor' && (
                <Link href="/instructor" className="text-ink hover:text-pine transition-colors">
                  Mi panel
                </Link>
              )}
              <Link href="/dashboard" className="text-ink hover:text-pine transition-colors">
                Mis cursos
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-full border border-line px-4 py-1.5 text-ink hover:border-pine hover:text-pine transition-colors"
                >
                  Cerrar sesión
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-ink hover:text-pine transition-colors">
                Iniciar sesión
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-pine px-4 py-1.5 text-white hover:bg-pine-dark transition-colors"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
