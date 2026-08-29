import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { updateCourse, togglePublish, addLesson, deleteLesson } from './actions'

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getCurrentUser()
  if (!session) redirect('/login')

  const supabase = await createClient()
  const { data: course } = await supabase.from('courses').select('*').eq('id', id).single()

  if (!course || course.instructor_id !== session.user.id) notFound()

  const { data: lessons } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', id)
    .order('position', { ascending: true })

  const updateCourseWithId = updateCourse.bind(null, id)
  const addLessonWithId = addLesson.bind(null, id)
  const publish = togglePublish.bind(null, id, true)
  const unpublish = togglePublish.bind(null, id, false)

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-3xl px-6 py-12 space-y-12">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl">{course.title}</h1>
          <form action={course.is_published ? unpublish : publish}>
            <button
              type="submit"
              className={`font-mono text-xs rounded-full px-4 py-2 border transition-colors ${
                course.is_published
                  ? 'border-line text-muted hover:border-pine'
                  : 'bg-pine text-white border-pine hover:bg-pine-dark'
              }`}
            >
              {course.is_published ? 'Pasar a borrador' : 'Publicar curso'}
            </button>
          </form>
        </div>

        {/* Datos del curso */}
        <div className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-display text-xl italic mb-4">Información general</h2>
          <form action={updateCourseWithId} className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5" htmlFor="title">
                Título
              </label>
              <input
                id="title"
                name="title"
                defaultValue={course.title}
                required
                className="w-full rounded-lg border border-line px-4 py-2.5 outline-none focus:border-pine"
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5" htmlFor="description">
                Descripción
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={course.description ?? ''}
                className="w-full rounded-lg border border-line px-4 py-2.5 outline-none focus:border-pine"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1.5" htmlFor="price_ars">
                  Precio (ARS)
                </label>
                <input
                  id="price_ars"
                  name="price_ars"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={course.price_ars}
                  className="w-full rounded-lg border border-line px-4 py-2.5 outline-none focus:border-pine"
                />
              </div>
              <div>
                <label className="block text-sm mb-1.5" htmlFor="price_usd">
                  Precio en USD (opcional)
                </label>
                <input
                  id="price_usd"
                  name="price_usd"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Ej: 29"
                  defaultValue={course.price_usd ?? ''}
                  className="w-full rounded-lg border border-line px-4 py-2.5 outline-none focus:border-pine"
                />
                <p className="mt-1 text-xs text-muted">
                  Si lo completás, se habilita el pago con tarjeta internacional (PayPal).
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1.5" htmlFor="cover_image_url">
                Imagen de portada (URL)
              </label>
              <input
                id="cover_image_url"
                name="cover_image_url"
                type="url"
                placeholder="https://..."
                defaultValue={course.cover_image_url ?? ''}
                className="w-full rounded-lg border border-line px-4 py-2.5 outline-none focus:border-pine"
              />
            </div>
            <button
              type="submit"
              className="rounded-full bg-pine text-white px-5 py-2.5 text-sm hover:bg-pine-dark transition-colors"
            >
              Guardar cambios
            </button>
          </form>
        </div>

        {/* Lecciones */}
        <div>
          <h2 className="font-display text-xl italic mb-4">Lecciones</h2>

          {lessons && lessons.length > 0 && (
            <ul className="rounded-2xl border border-line bg-surface divide-y divide-line overflow-hidden mb-6">
              {lessons.map((lesson, i) => {
                const removeLesson = deleteLesson.bind(null, id, lesson.id)
                return (
                  <li key={lesson.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="font-mono text-xs text-muted">
                        {String(i + 1).padStart(2, '0')}
                        {lesson.is_preview && ' · vista previa'}
                      </p>
                      <p className="text-sm">{lesson.title}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Link
                        href={`/instructor/cursos/${id}/lecciones/${lesson.id}`}
                        className="text-xs text-pine hover:underline font-mono"
                      >
                        editar contenido
                      </Link>
                      <form action={removeLesson}>
                        <button
                          type="submit"
                          className="text-xs text-red-500 hover:underline font-mono"
                        >
                          eliminar
                        </button>
                      </form>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="rounded-2xl border border-dashed border-line p-6">
            <h3 className="text-sm font-medium mb-4">Agregar lección</h3>
            <form action={addLessonWithId} className="space-y-4">
              <div>
                <label className="block text-sm mb-1.5" htmlFor="lesson_title">
                  Título de la lección
                </label>
                <input
                  id="lesson_title"
                  name="title"
                  required
                  placeholder="Ej: Introducción al curso"
                  className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 outline-none focus:border-pine"
                />
              </div>
              <div>
                <label className="block text-sm mb-1.5" htmlFor="video_url">
                  URL del video (Bunny.net, YouTube, Vimeo...)
                </label>
                <input
                  id="video_url"
                  name="video_url"
                  type="url"
                  required
                  placeholder="https://..."
                  className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 outline-none focus:border-pine"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-sm mb-1.5" htmlFor="duration_seconds">
                    Duración (segundos)
                  </label>
                  <input
                    id="duration_seconds"
                    name="duration_seconds"
                    type="number"
                    min={0}
                    defaultValue={0}
                    className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 outline-none focus:border-pine"
                  />
                </div>
                <label className="flex items-center gap-2 pb-2.5">
                  <input type="checkbox" name="is_preview" className="accent-pine" />
                  <span className="text-sm">Vista previa gratuita</span>
                </label>
              </div>
              <button
                type="submit"
                className="rounded-full bg-pine text-white px-5 py-2.5 text-sm hover:bg-pine-dark transition-colors"
              >
                Agregar lección
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}
