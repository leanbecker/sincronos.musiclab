import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import NoDownloadMedia from '@/components/NoDownloadMedia'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { renderMarkdown } from '@/lib/markdown'
import { getSignedUrl } from '@/lib/storage'
import { markLessonComplete, submitActivity, addNote } from './actions'

const BLOCK_LABELS: Record<string, string> = {
  text: 'Texto',
  sheet_music: 'Partitura',
  audio: 'Audio',
  image: 'Imagen',
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: 'En revisión', className: 'bg-gold/10 text-gold' },
  approved: { label: 'Aprobada', className: 'bg-pine/10 text-pine' },
  needs_revision: { label: 'A corregir', className: 'bg-red-50 text-red-600' },
}

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; leccionId: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { courseId, leccionId } = await params
  const { error } = await searchParams
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

  // Contenido de la lección
  const { data: blocks } = await supabase
    .from('lesson_blocks')
    .select('*')
    .eq('lesson_id', lesson.id)
    .order('position', { ascending: true })

  const blocksWithUrl = await Promise.all(
    (blocks ?? []).map(async (block) => ({
      ...block,
      url: block.type !== 'text' ? await getSignedUrl('lesson-media', block.content) : null,
    }))
  )

  // Actividades + mis entregas
  const { data: activities } = await supabase
    .from('lesson_activities')
    .select('*')
    .eq('lesson_id', lesson.id)
    .order('position', { ascending: true })

  const { data: submissions } = await supabase
    .from('activity_submissions')
    .select('*')
    .eq('student_id', session.user.id)
    .in('activity_id', (activities ?? []).map((a) => a.id))

  const submissionByActivity = new Map((submissions ?? []).map((s) => [s.activity_id, s]))

  // Mis notas privadas de esta lección
  const { data: notes } = await supabase
    .from('lesson_notes')
    .select('*, profiles(full_name)')
    .eq('lesson_id', lesson.id)
    .eq('student_id', session.user.id)
    .order('created_at', { ascending: true })

  const addNoteWithIds = addNote.bind(null, courseId, lesson.id)

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-10 grid lg:grid-cols-[1fr_300px] gap-8">
        <div>
          <Link href={`/cursos/${courseId}`} className="font-mono text-xs text-muted hover:text-pine">
            ← {course.title}
          </Link>
          <h1 className="font-display text-2xl mt-2 mb-4">{lesson.title}</h1>

          {error && (
            <p className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
              {error}
            </p>
          )}

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

          {/* Contenido adicional de la lección */}
          {blocksWithUrl.length > 0 && (
            <div className="mt-10 space-y-6">
              <h2 className="font-display text-xl italic">Material de la lección</h2>
              {blocksWithUrl.map((block) => (
                <div key={block.id} className="rounded-2xl border border-line bg-surface p-5">
                  <div className="mb-3">
                    <span className="font-mono text-[10px] uppercase tracking-wide text-gold bg-gold/10 rounded-full px-2 py-0.5">
                      {BLOCK_LABELS[block.type]}
                    </span>
                    {block.title && <p className="text-sm font-medium mt-2">{block.title}</p>}
                  </div>

                  {block.type === 'text' && (
                    <div
                      className="markdown-content text-sm"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(block.content) }}
                    />
                  )}
                  {block.type === 'image' && block.url && (
                    <NoDownloadMedia>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={block.url} alt={block.title ?? ''} className="rounded-lg max-h-96" />
                    </NoDownloadMedia>
                  )}
                  {block.type === 'sheet_music' && block.url && (
                    <NoDownloadMedia>
                      <iframe src={block.url} className="w-full h-96 rounded-lg border border-line" />
                    </NoDownloadMedia>
                  )}
                  {block.type === 'audio' && block.url && (
                    <audio controls src={block.url} className="w-full" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Actividades */}
          {activities && activities.length > 0 && (
            <div className="mt-10 space-y-4">
              <h2 className="font-display text-xl italic">Actividades</h2>
              {activities.map((activity) => {
                const submission = submissionByActivity.get(activity.id)
                const submitWithIds = submitActivity.bind(null, courseId, lesson.id, activity.id)
                const status = submission ? STATUS_LABELS[submission.status] : null

                return (
                  <div key={activity.id} className="rounded-2xl border border-line bg-surface p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-medium text-sm">{activity.title}</p>
                        {activity.description && (
                          <p className="text-sm text-muted mt-1">{activity.description}</p>
                        )}
                      </div>
                      <span
                        className={`font-mono text-[10px] rounded-full px-2 py-0.5 whitespace-nowrap ${
                          activity.is_required ? 'bg-ink/5 text-ink' : 'bg-line text-muted'
                        }`}
                      >
                        {activity.is_required ? 'obligatoria' : 'opcional'}
                      </span>
                    </div>

                    {status && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className={`font-mono text-[10px] rounded-full px-2 py-0.5 ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                    )}

                    {submission?.feedback && (
                      <p className="mt-2 text-sm bg-paper rounded-lg px-3 py-2 border border-line">
                        <span className="font-mono text-[10px] text-muted block mb-1">
                          Feedback del instructor:
                        </span>
                        {submission.feedback}
                      </p>
                    )}

                    <form action={submitWithIds} encType="multipart/form-data" className="mt-3 flex items-center gap-3">
                      <input name="video" type="file" accept="video/*" required className="text-xs" />
                      <button
                        type="submit"
                        className="rounded-full bg-pine text-white px-4 py-1.5 text-xs hover:bg-pine-dark transition-colors whitespace-nowrap"
                      >
                        {submission ? 'Volver a subir' : 'Subir video'}
                      </button>
                    </form>
                  </div>
                )
              })}
            </div>
          )}

          {/* Notas privadas */}
          <div className="mt-10">
            <h2 className="font-display text-xl italic mb-4">Mis notas (privadas)</h2>
            <p className="text-xs text-muted mb-4">Solo vos y el instructor pueden verlas.</p>

            {notes && notes.length > 0 && (
              <ul className="space-y-3 mb-4">
                {notes.map((note) => {
                  const authorName = (note.profiles as unknown as { full_name: string } | null)
                    ?.full_name
                  const isMine = note.author_id === session.user.id
                  return (
                    <li
                      key={note.id}
                      className={`rounded-xl border border-line p-3 text-sm ${
                        isMine ? 'bg-surface' : 'bg-pine/5'
                      }`}
                    >
                      <p className="font-mono text-[10px] text-muted mb-1">
                        {isMine ? 'Vos' : authorName ?? 'Instructor'}
                      </p>
                      {note.content}
                    </li>
                  )
                })}
              </ul>
            )}

            <form action={addNoteWithIds} className="flex items-start gap-3">
              <textarea
                name="content"
                required
                rows={2}
                placeholder="Escribí una nota o pregunta sobre esta lección..."
                className="flex-1 rounded-lg border border-line bg-surface px-4 py-2.5 outline-none focus:border-pine text-sm"
              />
              <button
                type="submit"
                className="rounded-full bg-pine text-white px-4 py-2.5 text-sm hover:bg-pine-dark transition-colors"
              >
                Enviar
              </button>
            </form>
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
