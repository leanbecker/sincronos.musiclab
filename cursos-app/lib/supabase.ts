// cursos-app/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Estas variables las sacas del panel de Supabase (Settings > API)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);