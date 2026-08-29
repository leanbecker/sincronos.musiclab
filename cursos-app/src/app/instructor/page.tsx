import Link from 'next/link'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export default async function InstructorPage() {
  const session = await getCurrentUser()
  if (!session) redirect('/login')
  if (session.profile?.role !== 'instructor') redirect('/dashboard')

  const supabase = await createClient()
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, price_ars, is_published, created_at')
    .eq('instructor_id', session.user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-3xl">Mi panel de instructor</h1>
          <Link
            href="/instructor/cursos/nuevo"
            className="rounded-full bg-pine text-white px-5 py-2.5 text-sm hover:bg-pine-dark transition-colors"
          >
            + Nuevo curso
          </Link>
        </div>

        {!courses || courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line py-16 text-center text-muted">
            Todavía no creaste ningún curso.
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-surface divide-y divide-line overflow-hidden">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/instructor/cursos/${course.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-pine/5 transition-colors"
              >
                <div>
                  <p className="font-display text-lg">{course.title}</p>
                  <p className="font-mono text-xs text-muted mt-1">
                    AR$ {Number(course.price_ars).toLocaleString('es-AR')}
                  </p>
                </div>
                <span
                  className={`font-mono text-xs rounded-full px-3 py-1 ${
                    course.is_published
                      ? 'bg-pine/10 text-pine'
                      : 'bg-gold/10 text-gold-700 text-gold'
                  }`}
                >
                  {course.is_published ? 'Publicado' : 'Borrador'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
