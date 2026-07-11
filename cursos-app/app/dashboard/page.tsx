import Link from 'next/link'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const session = await getCurrentUser()
  if (!session) redirect('/login')

  const supabase = await createClient()

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, course:courses(id, title, cover_image_url)')
    .eq('student_id', session.user.id)
    .eq('status', 'active')

  const courses = (enrollments ?? [])
    .map((e) => e.course)
    .flat()
    .filter(Boolean) as { id: string; title: string; cover_image_url: string | null }[]

  // Progreso por curso: lecciones totales vs completadas
  const progressByCourse: Record<string, { total: number; done: number }> = {}
  for (const course of courses) {
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', course.id)

    const lessonIds = (lessons ?? []).map((l) => l.id)
    let done = 0
    if (lessonIds.length > 0) {
      const { count } = await supabase
        .from('lesson_progress')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', session.user.id)
        .eq('completed', true)
        .in('lesson_id', lessonIds)
      done = count ?? 0
    }
    progressByCourse[course.id] = { total: lessonIds.length, done }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="font-display text-3xl mb-8">Mis cursos</h1>

        {courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line py-16 text-center text-muted">
            Todavía no compraste ningún curso.{' '}
            <Link href="/" className="text-pine hover:underline">
              Explorá el catálogo
            </Link>
            .
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const p = progressByCourse[course.id] ?? { total: 0, done: 0 }
              const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0
              return (
                <Link
                  key={course.id}
                  href={`/cursos/${course.id}`}
                  className="rounded-2xl border border-line bg-surface p-5 hover:border-pine transition-colors"
                >
                  <h3 className="font-display text-xl leading-snug mb-3">{course.title}</h3>
                  <div className="chalk-progress">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-2 font-mono text-xs text-muted">
                    {p.done}/{p.total} lecciones · {pct}%
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
