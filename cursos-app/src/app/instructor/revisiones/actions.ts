'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function reviewSubmission(submissionId: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const status = formData.get('status') as 'approved' | 'needs_revision'
  const feedback = (formData.get('feedback') as string) || null

  await supabase
    .from('activity_submissions')
    .update({
      status,
      feedback,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', submissionId)

  revalidatePath('/instructor/revisiones')
}
