import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, description, cover_image_url, price_ars')
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold mb-4">
          01 — Aprendé a tu ritmo
        </p>
        <h1 className="font-display text-5xl md:text-6xl leading-[1.05] max-w-2xl">
          Cursos hechos por quienes ya recorrieron el camino.
        </h1>
        <p className="mt-6 max-w-lg text-muted text-lg">
          Video clases, seguimiento de tu progreso y pago simple en pesos con Mercado Pago.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="flex items-baseline justify-between mb-6 border-b border-line pb-3">
          <h2 className="font-display text-2xl italic">Cursos disponibles</h2>
          <span className="font-mono text-xs text-muted">{courses?.length ?? 0} en catálogo</span>
        </div>

        {!courses || courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line py-16 text-center text-muted">
            Todavía no hay cursos publicados. Volvé pronto.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/cursos/${course.id}`}
                className="group rounded-2xl border border-line bg-surface overflow-hidden hover:border-pine transition-colors"
              >
                <div className="aspect-video bg-pine/10 flex items-center justify-center overflow-hidden">
                  {course.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.cover_image_url}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <span className="font-display italic text-3xl text-pine/40">Aula</span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-display text-xl leading-snug">{course.title}</h3>
                  <p className="mt-2 text-sm text-muted line-clamp-2">{course.description}</p>
                  <p className="mt-4 font-mono text-sm text-pine">
                    {Number(course.price_ars) === 0
                      ? 'Gratis'
                      : `AR$ ${Number(course.price_ars).toLocaleString('es-AR')}`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
