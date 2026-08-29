-- =========================================================
-- Migración: pagos internacionales en USD vía PayPal
-- (reemplaza a la migración de Stripe — Stripe no admite cuentas de Argentina)
-- Ejecutar en el SQL Editor de Supabase
-- =========================================================

-- Si ya habías corrido migration_stripe.sql, esto ajusta la restricción
-- para permitir 'paypal' como medio de pago válido.
alter table enrollments drop constraint if exists enrollments_payment_provider_check;
alter table enrollments
  add constraint enrollments_payment_provider_check
  check (payment_provider in ('mercadopago', 'paypal'));

-- Ids de PayPal equivalentes a los de Mercado Pago/Stripe
alter table enrollments add column if not exists paypal_order_id text;
alter table enrollments add column if not exists paypal_capture_id text;

-- Si el curso no tiene price_usd todavía (no corriste la migración de Stripe antes), lo agregamos:
alter table courses add column if not exists price_usd numeric(12,2);
