-- ============================================================
-- 006_storage_policies.sql
-- Caporales San Gabriel — Buckets y políticas de Storage
-- ============================================================
-- Los buckets se crean desde el Dashboard (Storage → New bucket):
--   • id-cards       → PRIVADO
--   • vouchers       → PRIVADO
--   • costume-images → PÚBLICO
-- Este script los crea por si no existen y aplica las políticas RLS.
-- ============================================================

-- Crear buckets (idempotente)
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('id-cards', 'id-cards', false),
  ('vouchers', 'vouchers', false),
  ('costume-images', 'costume-images', true)
ON CONFLICT (id) DO NOTHING;

-- ---------- id-cards ----------
-- INSERT: usuario autenticado, solo dentro de su propia carpeta (su UUID)
CREATE POLICY "id_cards_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'id-cards' AND (storage.foldername(name))[1] = auth.uid()::text);

-- SELECT: solo super_admin (el usuario recibe URL firmada generada en servidor)
CREATE POLICY "id_cards_select_admin"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'id-cards' AND is_super_admin());

-- DELETE: super_admin (p. ej. al rechazar una cuenta se elimina el carnet)
CREATE POLICY "id_cards_delete_admin"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'id-cards' AND is_super_admin());

-- ---------- vouchers ----------
-- INSERT: usuario autenticado
CREATE POLICY "vouchers_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vouchers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- SELECT: la lectura de vouchers se hace con URLs firmadas generadas en el
-- servidor (service_role). Política directa solo para super_admin.
CREATE POLICY "vouchers_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'vouchers' AND is_super_admin());

-- ---------- costume-images ----------
-- SELECT: público (bucket público)
CREATE POLICY "costume_images_select_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'costume-images');

-- INSERT: dueño autenticado (carpeta con su UUID)
CREATE POLICY "costume_images_insert_owner"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'costume-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- UPDATE/DELETE: dueño de la carpeta
CREATE POLICY "costume_images_update_owner"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'costume-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "costume_images_delete_owner"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'costume-images' AND (storage.foldername(name))[1] = auth.uid()::text);