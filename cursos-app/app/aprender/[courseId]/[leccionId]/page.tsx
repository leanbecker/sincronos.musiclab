import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { markLessonComplete } from './actions'

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; leccionId: string }>
}) {
  const { courseId, leccionId } = await params
  const session = await getCurrentUser()
  if (!session) redirect('/login')

  const supabase = await createClient()

  const { data: course } = await supabase
    .from('courses')
    .select('id, title, instructor_id')
    .eq('id', courseId)
    .single()
  if (!course) notFound()

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, video_url, is_preview')
    .eq('course_id', courseId)
    .order('position', { ascending: true })

  const lesson = lessons?.find((l) => l.id === leccionId)
  if (!lesson) notFound()

  // Chequeo de acceso: instructor dueño, vista previa, o inscripción activa
  const isOwner = course.instructor_id === session.user.id
  let hasAccess = isOwner || lesson.is_preview

  if (!hasAccess) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('status')
      .eq('student_id', session.user.id)
      .eq('course_id', courseId)
      .maybeSingle()
    hasAccess = enrollment?.status === 'active'
  }

  if (!hasAccess) redirect(`/cursos/${courseId}`)

  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('lesson_id, completed')
    .eq('student_id', session.user.id)
    .in('lesson_id', (lessons ?? []).map((l) => l.id))

  const completedIds = new Set((progress ?? []).filter((p) => p.completed).map((p) => p.lesson_id))
  const isComplete = completedIds.has(lesson.id)

  const currentIndex = (lessons ?? []).findIndex((l) => l.id === lesson.id)
  const nextLesson = lessons?.[currentIndex + 1]

  const markComplete = markLessonComplete.bind(null, courseId, lesson.id)

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-10 grid lg:grid-cols-[1fr_300px] gap-8">
        <div>
          <Link href={`/cursos/${courseId}`} className="font-mono text-xs text-muted hover:text-pine">
            ← {course.title}
          </Link>
          <h1 className="font-display text-2xl mt-2 mb-4">{lesson.title}</h1>

          <div className="aspect-video bg-ink rounded-2xl overflow-hidden">
            {/* Funciona con URLs directas de video (Bunny.net, mp4) o embeds de YouTube/Vimeo */}
            <video key={lesson.id} controls className="w-full h-full" src={lesson.video_url ?? undefined}>
              Tu navegador no soporta la reproducción de video.
            </video>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <form action={markComplete}>
              <button
                type="submit"
                disabled={isComplete}
                className={`rounded-full px-5 py-2.5 text-sm transition-colors ${
                  isComplete
                    ? 'bg-pine/10 text-pine cursor-default'
                    : 'bg-pine text-white hover:bg-pine-dark'
                }`}
              >
                {isComplete ? '✓ Lección completada' : 'Marcar como completada'}
              </button>
            </form>

            {nextLesson && (
              <Link
                href={`/aprender/${courseId}/${nextLesson.id}`}
                className="rounded-full border border-line px-5 py-2.5 text-sm hover:border-pine transition-colors"
              >
                Siguiente lección →
              </Link>
            )}
          </div>
        </div>

        <aside>
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-muted mb-3">
            Contenido del curso
          </h2>
          <ul className="rounded-2xl border border-line bg-surface divide-y divide-line overflow-hidden">
            {(lessons ?? []).map((l, i) => (
              <li key={l.id}>
                <Link
                  href={`/aprender/${courseId}/${l.id}`}
                  className={`flex items-center gap-3 px-4 py-3 text-sm hover:bg-pine/5 transition-colors ${
                    l.id === lesson.id ? 'bg-pine/5 text-pine' : ''
                  }`}
                >
                  <span className="font-mono text-xs text-muted w-5">
                    {completedIds.has(l.id) ? '✓' : String(i + 1).padStart(2, '0')}
                  </span>
                  {l.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </div>
  )
}
