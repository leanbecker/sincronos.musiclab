# Aula — Plataforma de cursos online

Next.js + Supabase (auth, base de datos, roles) + Mercado Pago (Checkout Pro) + video alojado en Bunny.net (u otro proveedor).

## 1. Creá el proyecto en Supabase

1. Andá a [supabase.com](https://supabase.com) → **New project**.
2. Cuando esté listo, abrí **SQL Editor** → pegá todo el contenido de `supabase/schema.sql` → **Run**.
   Esto crea las tablas (`profiles`, `courses`, `lessons`, `enrollments`, `lesson_progress`), el trigger que crea el perfil al registrarse, y las políticas de seguridad (RLS).
3. En **Project Settings → API** copiá:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (nunca la subas a un repo público ni la expongas en el cliente)

## 2. Conseguí tus credenciales de Mercado Pago

1. Entrá a [mercadopago.com.ar/developers/panel](https://www.mercadopago.com.ar/developers/panel) → tu aplicación → **Credenciales de producción** (o de prueba mientras desarrollás).
2. Copiá el **Access Token** → `MP_ACCESS_TOKEN`.
3. Con credenciales de prueba podés simular compras con usuarios de prueba antes de salir a producción.

## 3. Variables de entorno

Copiá `.env.local.example` a `.env.local` y completá los valores:

```bash
cp .env.local.example .env.local
```

## 4. Correr en local

```bash
npm install
npm run dev
```

Abrí http://localhost:3000

El webhook de Mercado Pago (`/api/mercadopago/webhook`) necesita una URL pública para recibir notificaciones. En local podés usar ngrok (`ngrok http 3000`) y poner esa URL como `NEXT_PUBLIC_SITE_URL` mientras probás pagos.

## 5. Subir videos (Bunny.net)

1. Creá una cuenta en bunny.net → **Stream** (plan pago por uso, barato para empezar).
2. Subís el video ahí, y Bunny te da una URL reproducible (MP4 directo o HLS).
3. Pegás esa URL en el campo "URL del video" al crear una lección desde tu panel de instructor.

También podés usar YouTube/Vimeo sin listar mientras validás el proyecto.

## 6. Convertirte en instructor

Al registrarte, elegí la opción "Enseñar" en el formulario de registro — eso te da el rol `instructor` y acceso a `/instructor` para crear cursos.

Para darle el rol de instructor a otro usuario ya registrado, corré en el SQL Editor de Supabase:

```sql
update profiles set role = 'instructor' where id = 'uuid-del-usuario';
```

## 7. Desplegar en Vercel

1. Subí este proyecto a un repo de GitHub.
2. En vercel.com → **Add New Project** → importá el repo.
3. Cargá las mismas variables de entorno del paso 3 (con `NEXT_PUBLIC_SITE_URL` apuntando a tu dominio de Vercel).
4. Deploy. La app arma la `notification_url` del webhook automáticamente usando `NEXT_PUBLIC_SITE_URL`, no hace falta configurar nada manual en Mercado Pago.

## Estructura del proyecto

```
app/
  page.tsx                            landing con catálogo de cursos
  login/, signup/                     autenticación
  dashboard/                          "Mis cursos" del alumno con progreso
  instructor/                         panel del instructor
  instructor/cursos/nuevo/            crear curso
  instructor/cursos/[id]/             editar curso + administrar lecciones
  cursos/[id]/                        página pública de venta del curso
  aprender/[courseId]/[leccionId]/    reproductor de lecciones + progreso
  api/mercadopago/create-preference/  crea el link de pago
  api/mercadopago/webhook/            confirma el pago y activa el acceso
lib/
  supabase/client.ts, server.ts, admin.ts
  mercadopago.ts
  auth.ts
supabase/schema.sql                   esquema completo de la base de datos
```

## Próximos pasos sugeridos

- Reemplazar el `<video>` simple por un reproductor HLS (hls.js) si Bunny te da streams `.m3u8`.
- Agregar recuperación de contraseña (`supabase.auth.resetPasswordForEmail`).
- Agregar certificados de finalización cuando el progreso llega a 100%.
- Panel de ventas/ingresos para el instructor.
