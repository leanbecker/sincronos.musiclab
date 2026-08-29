import { supabase } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import { notFound } from 'next/navigation';

export default async function LeccionPage({ params }: { params: { id: string } }) {
  const { id } = params;

  // Traemos los bloques de la lección desde Supabase
  const { data: blocks, error } = await supabase
    .from('lesson_blocks')
    .select('*')
    .eq('lesson_id', id)
    .order('position', { ascending: true });

  if (error || !blocks || blocks.length === 0) {
    notFound();
  }

  return (
    <main className="max-w-4xl mx-auto p-6 md:p-10 space-y-12">
      <h1 className="text-3xl font-bold mb-8">Contenido de la lección</h1>
      
      <div className="space-y-10">
        {blocks.map((block) => (
          <BloqueRenderer key={block.id} block={block} />
        ))}
      </div>
    </main>
  );
}

// Renderizador de bloques
function BloqueRenderer({ block }: { block: any }) {
  switch (block.type) {
    case 'text':
      return (
        <div className="prose prose-lg max-w-none">
          <ReactMarkdown>{block.content}</ReactMarkdown>
        </div>
      );
    case 'image':
      return (
        <div className="my-6">
          <img src={block.content} alt="Imagen" className="rounded-lg shadow-md max-w-full" />
        </div>
      );
    case 'video':
      return (
        <div className="my-6 aspect-video bg-black rounded-lg overflow-hidden">
          <video src={block.content} controls className="w-full h-full object-contain" />
        </div>
      );
    default:
      return <p>Tipo de contenido no soportado aún</p>;
  }
}