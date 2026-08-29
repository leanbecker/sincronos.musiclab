import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Usa la service_role key: se salta Row Level Security.
// SOLO se importa desde código que corre en el servidor (route handlers),
// nunca debe llegar al navegador. No agregar NEXT_PUBLIC_ al nombre de la env var.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
