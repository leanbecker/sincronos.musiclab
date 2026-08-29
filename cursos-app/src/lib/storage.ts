import { createAdminClient } from '@/lib/supabase/admin'

// Todo el acceso a los buckets privados pasa por el cliente admin (service_role),
// nunca directo desde el navegador: así el link que ve el alumno es siempre
// temporal (unos minutos) y no se puede reenviar ni guardar para verlo después.

export async function getSignedUrl(bucket: 'lesson-media' | 'submissions', path: string, expiresInSeconds = 600) {
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, expiresInSeconds)
  if (error || !data) return null
  return data.signedUrl
}

export async function uploadToBucket(
  bucket: 'lesson-media' | 'submissions',
  path: string,
  file: File
) {
  const admin = createAdminClient()
  const { error } = await admin.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  })
  if (error) throw new Error(error.message)
  return path
}

export async function deleteFromBucket(bucket: 'lesson-media' | 'submissions', path: string) {
  const admin = createAdminClient()
  await admin.storage.from(bucket).remove([path])
}
