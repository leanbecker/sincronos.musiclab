import Link from 'next/link'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/storage'
import { reviewSubmission } from './actions'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-gold/10 text-gold' },
  approved: { label: 'Aprobada', className: 'bg-pine/10 text-pine' },
  needs_revision: { label: 'A corregir', className: 'bg-red-50 text-red-600' },
}

export default async function RevisionesPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>
}) {
  const { filtro } = await searchParams
  const session = await getCurrentUser()
  if (!session) redirect('/login')
  if (session.profile?.role !== 'instructor') redirect('/dashboard')

  const supabase = await createClient()

  let query = supabase
    .from('activity_submissions')
    .select(
      `*,
      profiles(full_name),
      lesson_activities(title, lessons(id, title, course_id, courses(title)))`
    )
    .order('submitted_at', { ascending: false })

  if (filtro === 'pendientes' || !filtro) {
    query = query.eq('status', 'pending')
  } else if (filtro === 'corregidas') {
    query = query.neq('status', 'pending')
  }

  const { data: submissions } = await query

  const submissionsWithUrl = await Promise.all(
    (submissions ?? []).map(async (s) => ({
      ...s,
      url: await getSignedUrl('submissions', s.video_path, 900),
    }))
  )

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-3xl mb-2">Revisiones</h1>
        <p className="text-muted text-sm mb-6">
          Videos que subieron tus alumnos resolviendo actividades.
        </p>

        <div className="flex gap-2 mb-8">
          <Link
            href="/instructor/revisiones?filtro=pendientes"
            className={`font-mono text-xs rounded-full px-4 py-1.5 border transition-colors ${
              !filtro || filtro === 'pendientes'
                ? 'bg-pine text-white border-pine'
                : 'border-line text-muted hover:border-pine'
            }`}
          >
            Pendientes
          </Link>
          <Link
            href="/instructor/revisiones?filtro=corregidas"
            className={`font-mono text-xs rounded-full px-4 py-1.5 border transition-colors ${
              filtro === 'corregidas'
                ? 'bg-pine text-white border-pine'
                : 'border-line text-muted hover:border-pine'
            }`}
          >
            Ya corregidas
          </Link>
        </div>

        {submissionsWithUrl.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line py-16 text-center text-muted">
            No hay entregas acá.
          </div>
        ) : (
          <div className="space-y-6">
            {submissionsWithUrl.map((s) => {
              const activity = s.lesson_activities as unknown as {
                title: string
                lessons: { id: string; title: string; course_id: string; courses: { title: string } }
              }
              const status = STATUS_LABELS[s.status]
              const studentName =
                (s.profiles as unknown as { full_name: string } | null)?.full_name ?? 'Alumno'
              const approve = reviewSubmission.bind(null, s.id)

              return (
                <div key={s.id} className="rounded-2xl border border-line bg-surface p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-mono text-xs text-muted">
                        {activity.lessons.courses.title} · {activity.lessons.title}
                      </p>
                      <p className="font-medium text-sm mt-1">{activity.title}</p>
                      <p className="text-xs text-muted mt-1">Alumno: {studentName}</p>
                    </div>
                    <span className={`font-mono text-[10px] rounded-full px-2 py-0.5 whitespace-nowrap ${status.className}`}>
                      {status.label}
                    </span>
                  </div>

                  {s.url && (
                    <video controls src={s.url} className="w-full rounded-lg mb-3 max-h-96" />
                  )}

                  {s.feedback && (
                    <p className="text-sm bg-paper rounded-lg px-3 py-2 border border-line mb-3">
                      <span className="font-mono text-[10px] text-muted block mb-1">
                        Tu feedback anterior:
                      </span>
                      {s.feedback}
                    </p>
                  )}

                  <form action={approve} className="space-y-2">
                    <textarea
                      name="feedback"
                      rows={2}
                      defaultValue={s.feedback ?? ''}
                      placeholder="Feedback para el alumno (opcional)"
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-pine text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        name="status"
                        value="approved"
                        className="rounded-full bg-pine text-white px-4 py-1.5 text-xs hover:bg-pine-dark transition-colors"
                      >
                        Aprobar
                      </button>
                      <button
                        type="submit"
                        name="status"
                        value="needs_revision"
                        className="rounded-full border border-line px-4 py-1.5 text-xs hover:border-pine transition-colors"
                      >
                        Pedir corrección
                      </button>
                    </div>
                  </form>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
