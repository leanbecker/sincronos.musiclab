-- =========================================================
-- Corrección: el alumno no podía "reintentar" una compra
-- (cambiar de medio de pago, o volver a intentar tras un pago fallido)
-- porque no existía un permiso de UPDATE para su propia fila en enrollments.
-- Ejecutar en el SQL Editor de Supabase.
-- =========================================================

drop policy if exists "Alumno actualiza su inscripción pendiente" on enrollments;

create policy "Alumno actualiza su inscripción pendiente" on enrollments
  for update
  using (student_id = auth.uid())
  -- El "with check" impide que el alumno pueda setear su propio estado en 'active':
  -- solo se permite seguir en 'pending' o pasar a 'cancelled' desde el propio cliente.
  -- La activación real ('active') la hace siempre el webhook/captura con la service_role key.
  with check (student_id = auth.uid() and status <> 'active');
