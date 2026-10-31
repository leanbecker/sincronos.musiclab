import Link from 'next/link'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import BuyButton from '@/components/BuyButton'
import PayPalBuyButton from '@/components/PayPalBuyButton'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

function formatDuration(totalSeconds: number) {
  if (!totalSeconds || totalSeconds <= 0) return null
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h > 0) return `${h} h ${m} min`
  return `${m} min`
}

function formatLessonDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return null
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

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

  const { data: instructor } = course.instructor_id
    ? await supabase
        .from('profiles')
        .select('id, full_name, bio, avatar_url')
        .eq('id', course.instructor_id)
        .maybeSingle()
    : { data: null }

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

  const lessonList = lessons ?? []
  const totalSeconds = lessonList.reduce((acc, l) => acc + (l.duration_seconds ?? 0), 0)
  const totalDuration = formatDuration(totalSeconds)
  const firstLessonId = lessonList[0]?.id

  const outcomes: string[] = Array.isArray(course.learning_outcomes)
    ? course.learning_outcomes
    : []

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="mx-auto max-w-3xl px-6 py-10 md:py-14">
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

        {/* HERO */}
        <div className="mb-10">
          <div className="aspect-video rounded-2xl overflow-hidden bg-pine/10 mb-8 border border-line">
            {course.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.cover_image_url}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="font-display italic text-4xl text-pine/30">Aula</span>
              </div>
            )}
          </div>

          <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold mb-3">
            Curso
          </p>

          <h1 className="font-display text-4xl md:text-5xl leading-tight mb-3">
            {course.title}
          </h1>

          {course.description && (
            <p className="text-muted text-lg leading-relaxed mb-6 max-w-2xl">
              {course.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted mb-8">
            <span>
              {lessonList.length} {lessonList.length === 1 ? 'lección' : 'lecciones'}
            </span>
            {totalDuration && (
              <>
                <span className="text-line">·</span>
                <span>{totalDuration}</span>
              </>
            )}
            <span className="text-line">·</span>
            <span>Acceso de por vida</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="font-mono text-2xl text-pine">
                {Number(course.price_ars) === 0
                  ? 'Gratis'
                  : `AR$ ${Number(course.price_ars).toLocaleString('es-AR')}`}
              </p>
              {course.price_usd && Number(course.price_ars) > 0 && (
                <p className="font-mono text-sm text-muted">
                  o US$ {Number(course.price_usd).toLocaleString('en-US')}
                </p>
              )}
            </div>

            {isEnrolled ? (
              <Link
                href={`/aprender/${course.id}/${firstLessonId ?? ''}`}
                className="rounded-full bg-pine text-white px-7 py-3.5 text-sm font-medium hover:bg-pine-dark transition-colors"
              >
                Continuar curso
              </Link>
            ) : session ? (
              <div className="flex flex-wrap items-center gap-3">
                <BuyButton courseId={course.id} />
                {course.price_usd && <PayPalBuyButton courseId={course.id} />}
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-pine text-white px-7 py-3.5 text-sm font-medium hover:bg-pine-dark transition-colors"
              >
                Iniciá sesión para comprar
              </Link>
            )}
          </div>
        </div>

        {/* QUÉ VAS A APRENDER */}
        {outcomes.length > 0 && (
          <section className="mb-12">
            <h2 className="font-display text-2xl italic mb-5">Qué vas a lograr</h2>
            <ul className="space-y-3">
              {outcomes.map((item, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-snug">
                  <span className="text-pine mt-0.5 shrink-0">→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CONTENIDO DEL CURSO */}
        <section className="mb-12">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-2xl italic">Contenido del curso</h2>
            {lessonList.length > 0 && (
              <span className="font-mono text-xs text-muted">
                {lessonList.length} lecciones
                {totalDuration ? ` · ${totalDuration}` : ''}
              </span>
            )}
          </div>

          {lessonList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line py-12 text-center text-muted text-sm">
              Las lecciones se están preparando. Volvé pronto.
            </div>
          ) : (
            <ul className="rounded-2xl border border-line bg-surface divide-y divide-line overflow-hidden">
              {lessonList.map((lesson, i) => {
                const canWatch = lesson.is_preview || isEnrolled
                return (
                  <li
                    key={lesson.id}
                    className="flex items-center justify-between gap-4 px-5 py-3.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs text-muted shrink-0 w-6">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm truncate">{lesson.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {lesson.is_preview && (
                            <span className="font-mono text-[10px] text-pine bg-pine/10 rounded-full px-2 py-0.5">
                              vista previa
                            </span>
                          )}
                          {formatLessonDuration(lesson.duration_seconds) && (
                            <span className="font-mono text-[11px] text-muted">
                              {formatLessonDuration(lesson.duration_seconds)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {canWatch ? (
                      <Link
                        href={`/aprender/${course.id}/${lesson.id}`}
                        className="text-xs text-pine hover:underline shrink-0 font-medium"
                      >
                        ver
                      </Link>
                    ) : (
                      <span className="text-xs text-muted shrink-0">—</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* INSTRUCTOR */}
        {instructor && (
          <section className="mb-12">
            <h2 className="font-display text-2xl italic mb-5">Sobre el instructor</h2>
            <div className="flex gap-5 items-start rounded-2xl border border-line bg-surface p-5">
              <div className="w-16 h-16 rounded-full bg-pine/10 overflow-hidden shrink-0 flex items-center justify-center">
                {instructor.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={instructor.avatar_url}
                    alt={instructor.full_name ?? 'Instructor'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-display text-xl text-pine/40">
                    {(instructor.full_name ?? 'I').charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <p className="font-display text-lg leading-snug">
                  {instructor.full_name ?? 'Instructor'}
                </p>
                {instructor.bio ? (
                  <p className="mt-2 text-sm text-muted leading-relaxed">{instructor.bio}</p>
                ) : (
                  <p className="mt-2 text-sm text-muted">Instructor en Aula.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* DETALLES */}
        <section className="mb-12">
          <h2 className="font-display text-2xl italic mb-5">Detalles del curso</h2>
          <div className="rounded-2xl border border-line bg-surface overflow-hidden">
            <dl className="divide-y divide-line">
              {[
                { label: 'Acceso', value: 'De por vida' },
                { label: 'Dispositivos', value: 'Celular, tablet y computadora' },
                { label: 'Idioma', value: 'Español' },
                {
                  label: 'Lecciones',
                  value: `${lessonList.length} ${lessonList.length === 1 ? 'lección' : 'lecciones'}`,
                },
                totalDuration ? { label: 'Duración total', value: totalDuration } : null,
                { label: 'Pago', value: 'Único · Mercado Pago / PayPal' },
              ]
                .filter(Boolean)
                .map((row) => (
                  <div
                    key={row!.label}
                    className="flex justify-between gap-4 px-5 py-3.5 text-sm"
                  >
                    <dt className="text-muted">{row!.label}</dt>
                    <dd className="text-right font-medium">{row!.value}</dd>
                  </div>
                ))}
            </dl>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-14">
          <h2 className="font-display text-2xl italic mb-5">Preguntas frecuentes</h2>
          <div className="space-y-3">
            {[
              {
                q: '¿Puedo ver el curso a mi ritmo?',
                a: 'Sí. No hay fechas ni vencimiento. Accedés cuando quieras, para siempre.',
              },
              {
                q: '¿Qué pasa si no me gusta?',
                a: 'Tenés 7 días desde la compra para pedir el reembolso completo.',
              },
              {
                q: '¿Necesito equipos especiales?',
                a: 'Depende del curso. En la descripción se indica el nivel y los requisitos mínimos.',
              },
              {
                q: '¿Cómo accedo después de pagar?',
                a: 'En cuanto se confirma el pago, el curso aparece en “Mis cursos” y podés empezar de inmediato.',
              },
            ].map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-line bg-surface"
              >
                <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium flex justify-between items-center gap-4">
                  {item.q}
                  <span className="text-muted group-open:rotate-45 transition-transform text-lg leading-none">
                    +
                  </span>
                </summary>
                <p className="px-5 pb-4 text-sm text-muted leading-relaxed -mt-1">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA FINAL */}
        {!isEnrolled && (
          <section className="rounded-2xl border border-line bg-surface px-6 py-8 text-center">
            <p className="font-display text-2xl italic mb-2">¿Listo para empezar?</p>
            <p className="text-muted text-sm mb-6">
              Acceso inmediato · Pago único · Sin suscripción
            </p>
            <p className="font-mono text-xl text-pine mb-5">
              {Number(course.price_ars) === 0
                ? 'Gratis'
                : `AR$ ${Number(course.price_ars).toLocaleString('es-AR')}`}
            </p>
            {session ? (
              <div className="flex flex-wrap justify-center gap-3">
                <BuyButton courseId={course.id} />
                {course.price_usd && <PayPalBuyButton courseId={course.id} />}
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-block rounded-full bg-pine text-white px-8 py-3.5 text-sm font-medium hover:bg-pine-dark transition-colors"
              >
                Iniciá sesión para comprar
              </Link>
            )}
          </section>
        )}
      </div>
    </div>
  )
}