import Link from 'next/link'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import BuyButton from '@/components/BuyButton'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ compra?: string }>
}) {
  const { id } = await params
  const { compra } = await searchParams
  const session = await getCurrentUser()
  const supabase = await createClient()

  const { data: course } = await supabase.from('courses').select('*').eq('id', id).single()
  if (!course) notFound()

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, is_preview, duration_seconds')
    .eq('course_id', id)
    .order('position', { ascending: true })

  let isEnrolled = false
  if (session) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('status')
      .eq('student_id', session.user.id)
      .eq('course_id', id)
      .maybeSingle()
    isEnrolled = enrollment?.status === 'active'
  }

  const firstLessonId = lessons?.[0]?.id

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-3xl px-6 py-12">
        {compra === 'exitosa' && (
          <p className="mb-6 rounded-lg bg-pine/10 text-pine text-sm px-4 py-3">
            ¡Pago recibido! Puede tardar unos segundos en activarse tu acceso.
          </p>
        )}
        {compra === 'pendiente' && (
          <p className="mb-6 rounded-lg bg-gold/10 text-gold text-sm px-4 py-3">
            Tu pago está pendiente de confirmación.
          </p>
        )}
        {compra === 'fallida' && (
          <p className="mb-6 rounded-lg bg-red-50 text-red-600 text-sm px-4 py-3">
            El pago no se pudo procesar. Podés intentar de nuevo.
          </p>
        )}

        <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold mb-4">Curso</p>
        <h1 className="font-display text-4xl leading-tight mb-4">{course.title}</h1>
        <p className="text-muted text-lg mb-8">{course.description}</p>

        <div className="flex items-center gap-6 mb-10">
          <p className="font-mono text-xl text-pine">
            {Number(course.price_ars) === 0
              ? 'Gratis'
              : `AR$ ${Number(course.price_ars).toLocaleString('es-AR')}`}
          </p>

          {isEnrolled ? (
            <Link
              href={`/aprender/${course.id}/${firstLessonId ?? ''}`}
              className="rounded-full bg-pine text-white px-6 py-3 hover:bg-pine-dark transition-colors"
            >
              Continuar curso
            </Link>
          ) : session ? (
            <BuyButton courseId={course.id} />
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-pine text-white px-6 py-3 hover:bg-pine-dark transition-colors"
            >
              Iniciá sesión para comprar
            </Link>
          )}
        </div>

        <div className="border-t border-line pt-6">
          <h2 className="font-display text-xl italic mb-4">Contenido del curso</h2>
          <ul className="rounded-2xl border border-line bg-surface divide-y divide-line overflow-hidden">
            {(lessons ?? []).map((lesson, i) => (
              <li key={lesson.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-sm">{lesson.title}</span>
                  {lesson.is_preview && (
                    <span className="font-mono text-[10px] text-pine bg-pine/10 rounded-full px-2 py-0.5">
                      vista previa
                    </span>
                  )}
                </div>
                {(lesson.is_preview || isEnrolled) && (
                  <Link
                    href={`/aprender/${course.id}/${lesson.id}`}
                    className="text-xs text-pine hover:underline"
                  >
                    ver
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
