import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { renderMarkdown } from '@/lib/markdown'
import { getSignedUrl } from '@/lib/storage'
import NoDownloadMedia from '@/components/NoDownloadMedia'
import {
  addTextBlock,
  addFileBlock,
  deleteBlock,
  addActivity,
  deleteActivity,
} from './actions'

const BLOCK_LABELS: Record<string, string> = {
  text: 'Texto',
  sheet_music: 'Partitura',
  audio: 'Audio',
  image: 'Imagen',
}

export default async function LessonContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; lessonId: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id: courseId, lessonId } = await params
  const { error } = await searchParams
  const session = await getCurrentUser()
  if (!session) redirect('/login')

  const supabase = await createClient()

  const { data: lesson } = await supabase
    .from('lessons')
    .select('*, courses(instructor_id, title)')
    .eq('id', lessonId)
    .single()

  const courseInfo = lesson?.courses as unknown as { instructor_id: string; title: string } | null
  if (!lesson || courseInfo?.instructor_id !== session.user.id) notFound()

  const { data: blocks } = await supabase
    .from('lesson_blocks')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('position', { ascending: true })

  const { data: activities } = await supabase
    .from('lesson_activities')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('position', { ascending: true })

  // Generamos URLs firmadas para que el instructor pueda previsualizar
  // sus propios archivos subidos (partituras/audio/imágenes)
  const blocksWithUrl = await Promise.all(
    (blocks ?? []).map(async (block) => ({
      ...block,
      url: block.type !== 'text' ? await getSignedUrl('lesson-media', block.content) : null,
    }))
  )

  const addTextBlockWithId = addTextBlock.bind(null, lessonId)
  const addSheetMusic = addFileBlock.bind(null, lessonId, 'sheet_music')
  const addAudio = addFileBlock.bind(null, lessonId, 'audio')
  const addImage = addFileBlock.bind(null, lessonId, 'image')
  const addActivityWithId = addActivity.bind(null, lessonId)

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-3xl px-6 py-12 space-y-12">
        <div>
          <Link
            href={`/instructor/cursos/${courseId}`}
            className="font-mono text-xs text-muted hover:text-pine"
          >
            ← {courseInfo?.title}
          </Link>
          <h1 className="font-display text-3xl mt-2">{lesson.title}</h1>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
            {error}
          </p>
        )}

        {/* Bloques de contenido existentes */}
        <div>
          <h2 className="font-display text-xl italic mb-4">Contenido de la lección</h2>

          {blocksWithUrl.length === 0 ? (
            <p className="text-sm text-muted mb-6">Todavía no agregaste contenido.</p>
          ) : (
            <ul className="space-y-4 mb-8">
              {blocksWithUrl.map((block) => {
                const removeBlock = deleteBlock.bind(null, lessonId, block.id)
                return (
                  <li key={block.id} className="rounded-2xl border border-line bg-surface p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="font-mono text-[10px] uppercase tracking-wide text-gold bg-gold/10 rounded-full px-2 py-0.5">
                          {BLOCK_LABELS[block.type]}
                        </span>
                        {block.title && <p className="text-sm font-medium mt-2">{block.title}</p>}
                      </div>
                      <form action={removeBlock}>
                        <button type="submit" className="text-xs text-red-500 hover:underline font-mono">
                          eliminar
                        </button>
                      </form>
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
                        <img src={block.url} alt={block.title ?? ''} className="rounded-lg max-h-80" />
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
                  </li>
                )
              })}
            </ul>
          )}

          {/* Agregar texto */}
          <details className="rounded-2xl border border-dashed border-line p-6 mb-3 group">
            <summary className="text-sm font-medium cursor-pointer">+ Agregar bloque de texto</summary>
            <form action={addTextBlockWithId} className="space-y-3 mt-4">
              <input
                name="title"
                placeholder="Título (opcional)"
                className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 outline-none focus:border-pine text-sm"
              />
              <textarea
                name="content"
                required
                rows={6}
                placeholder="Escribí en markdown: **negrita**, _cursiva_, - listas, etc."
                className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 outline-none focus:border-pine text-sm font-mono"
              />
              <button
                type="submit"
                className="rounded-full bg-pine text-white px-5 py-2 text-sm hover:bg-pine-dark transition-colors"
              >
                Agregar texto
              </button>
            </form>
          </details>

          {/* Agregar partitura */}
          <details className="rounded-2xl border border-dashed border-line p-6 mb-3 group">
            <summary className="text-sm font-medium cursor-pointer">+ Agregar partitura (PDF/imagen)</summary>
            <form action={addSheetMusic} className="space-y-3 mt-4" encType="multipart/form-data">
              <input
                name="title"
                placeholder="Título (opcional)"
                className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 outline-none focus:border-pine text-sm"
              />
              <input
                name="file"
                type="file"
                accept="application/pdf,image/*"
                required
                className="w-full text-sm"
              />
              <button
                type="submit"
                className="rounded-full bg-pine text-white px-5 py-2 text-sm hover:bg-pine-dark transition-colors"
              >
                Subir partitura
              </button>
            </form>
          </details>

          {/* Agregar audio */}
          <details className="rounded-2xl border border-dashed border-line p-6 mb-3 group">
            <summary className="text-sm font-medium cursor-pointer">+ Agregar audio corto</summary>
            <form action={addAudio} className="space-y-3 mt-4" encType="multipart/form-data">
              <input
                name="title"
                placeholder="Título (opcional)"
                className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 outline-none focus:border-pine text-sm"
              />
              <input name="file" type="file" accept="audio/*" required className="w-full text-sm" />
              <button
                type="submit"
                className="rounded-full bg-pine text-white px-5 py-2 text-sm hover:bg-pine-dark transition-colors"
              >
                Subir audio
              </button>
            </form>
          </details>

          {/* Agregar imagen */}
          <details className="rounded-2xl border border-dashed border-line p-6 group">
            <summary className="text-sm font-medium cursor-pointer">+ Agregar imagen</summary>
            <form action={addImage} className="space-y-3 mt-4" encType="multipart/form-data">
              <input
                name="title"
                placeholder="Título (opcional)"
                className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 outline-none focus:border-pine text-sm"
              />
              <input name="file" type="file" accept="image/*" required className="w-full text-sm" />
              <button
                type="submit"
                className="rounded-full bg-pine text-white px-5 py-2 text-sm hover:bg-pine-dark transition-colors"
              >
                Subir imagen
              </button>
            </form>
          </details>
        </div>

        {/* Actividades */}
        <div>
          <h2 className="font-display text-xl italic mb-4">Actividades</h2>

          {activities && activities.length > 0 && (
            <ul className="rounded-2xl border border-line bg-surface divide-y divide-line overflow-hidden mb-6">
              {activities.map((activity) => {
                const removeActivity = deleteActivity.bind(null, lessonId, activity.id)
                return (
                  <li key={activity.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm">{activity.title}</p>
                      <p className="font-mono text-[10px] text-muted mt-1">
                        {activity.is_required ? 'obligatoria' : 'opcional'}
                      </p>
                    </div>
                    <form action={removeActivity}>
                      <button type="submit" className="text-xs text-red-500 hover:underline font-mono">
                        eliminar
                      </button>
                    </form>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="rounded-2xl border border-dashed border-line p-6">
            <h3 className="text-sm font-medium mb-4">Agregar actividad</h3>
            <form action={addActivityWithId} className="space-y-4">
              <input
                name="title"
                required
                placeholder="Ej: Grabate tocando el ejercicio 1"
                className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 outline-none focus:border-pine text-sm"
              />
              <textarea
                name="description"
                rows={3}
                placeholder="Consigna (opcional)"
                className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 outline-none focus:border-pine text-sm"
              />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="is_required" defaultChecked className="accent-pine" />
                Obligatoria
              </label>
              <button
                type="submit"
                className="rounded-full bg-pine text-white px-5 py-2 text-sm hover:bg-pine-dark transition-colors"
              >
                Agregar actividad
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}
