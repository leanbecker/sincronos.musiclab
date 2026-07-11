import Navbar from '@/components/Navbar'
import { createCourse } from './actions'

export default async function NewCoursePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-xl px-6 py-12">
        <h1 className="font-display text-3xl mb-1">Nuevo curso</h1>
        <p className="text-muted text-sm mb-8">
          Empezá con lo básico. Después vas a poder agregar las lecciones en video.
        </p>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
            {error}
          </p>
        )}

        <form action={createCourse} className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5" htmlFor="title">
              Título del curso
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="Ej: Fotografía para principiantes"
              className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 outline-none focus:border-pine"
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
              placeholder="¿Qué van a aprender tus alumnos?"
              className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 outline-none focus:border-pine"
            />
          </div>
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
              defaultValue={0}
              className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 outline-none focus:border-pine"
            />
            <p className="mt-1 text-xs text-muted">Poné 0 si el curso es gratuito.</p>
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-pine text-white py-2.5 hover:bg-pine-dark transition-colors"
          >
            Crear curso
          </button>
        </form>
      </section>
    </div>
  )
}
