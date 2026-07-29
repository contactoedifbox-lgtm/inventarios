-- ============================================================
-- 003_rls_policies.sql
-- Caporales San Gabriel — Row Level Security
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE costumes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE costume_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_tokens ENABLE ROW LEVEL SECURITY;

-- Helper: verificar si el usuario es super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- Helper: verificar si el usuario está aprobado
CREATE OR REPLACE FUNCTION is_approved()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('approved', 'super_admin')
  );
$$;

-- PROFILES
-- Nota: el SELECT público permite mostrar nombre/ciudad del dueño en el catálogo.
-- Los datos sensibles (rut, phone, address) se exponen solo al dueño o al admin
-- desde consultas del servidor (service_role bypassea RLS de forma controlada).
CREATE POLICY "profiles_select_own"   ON profiles FOR SELECT USING (auth.uid() = id OR is_super_admin());
CREATE POLICY "profiles_select_public" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own"   ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE USING (is_super_admin());
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE USING (is_super_admin());

-- EVENTS
CREATE POLICY "events_select_all"   ON events FOR SELECT USING (true);
CREATE POLICY "events_insert_admin" ON events FOR INSERT WITH CHECK (is_super_admin());
CREATE POLICY "events_update_admin" ON events FOR UPDATE USING (is_super_admin());
CREATE POLICY "events_delete_admin" ON events FOR DELETE USING (is_super_admin());

-- COSTUMES
CREATE POLICY "costumes_select_all"   ON costumes FOR SELECT USING (is_sold = false OR auth.uid() = owner_id OR is_super_admin());
CREATE POLICY "costumes_insert_owner" ON costumes FOR INSERT WITH CHECK (auth.uid() = owner_id AND is_approved());
CREATE POLICY "costumes_update_owner" ON costumes FOR UPDATE USING (auth.uid() = owner_id OR is_super_admin());
CREATE POLICY "costumes_delete_owner" ON costumes FOR DELETE USING (auth.uid() = owner_id OR is_super_admin());

-- COSTUME_EVENTS
CREATE POLICY "ce_select_all"   ON costume_events FOR SELECT USING (true);
CREATE POLICY "ce_insert_owner" ON costume_events FOR INSERT WITH CHECK (
  is_approved() AND EXISTS (SELECT 1 FROM costumes WHERE id = costume_id AND owner_id = auth.uid())
);
CREATE POLICY "ce_delete_owner" ON costume_events FOR DELETE USING (
  EXISTS (SELECT 1 FROM costumes WHERE id = costume_id AND owner_id = auth.uid())
  OR is_super_admin()
);

-- RENTALS
CREATE POLICY "rentals_select" ON rentals FOR SELECT USING (
  auth.uid() = renter_id OR
  EXISTS (SELECT 1 FROM costumes WHERE id = costume_id AND owner_id = auth.uid()) OR
  is_super_admin()
);
CREATE POLICY "rentals_insert" ON rentals FOR INSERT WITH CHECK (auth.uid() = renter_id AND is_approved());
CREATE POLICY "rentals_update" ON rentals FOR UPDATE USING (
  EXISTS (SELECT 1 FROM costumes WHERE id = costume_id AND owner_id = auth.uid()) OR is_super_admin()
);

-- SALES
CREATE POLICY "sales_select" ON sales FOR SELECT USING (
  auth.uid() = buyer_id OR
  EXISTS (SELECT 1 FROM costumes WHERE id = costume_id AND owner_id = auth.uid()) OR
  is_super_admin()
);
CREATE POLICY "sales_insert" ON sales FOR INSERT WITH CHECK (auth.uid() = buyer_id AND is_approved());
CREATE POLICY "sales_update" ON sales FOR UPDATE USING (
  EXISTS (SELECT 1 FROM costumes WHERE id = costume_id AND owner_id = auth.uid()) OR is_super_admin()
);

-- AUDIT LOGS
CREATE POLICY "audit_select_admin" ON audit_logs FOR SELECT USING (is_super_admin());
CREATE POLICY "audit_insert_admin" ON audit_logs FOR INSERT WITH CHECK (is_super_admin());

-- APPROVAL TOKENS
CREATE POLICY "tokens_select_admin" ON approval_tokens FOR SELECT USING (is_super_admin());
CREATE POLICY "tokens_insert_admin" ON approval_tokens FOR INSERT WITH CHECK (is_super_admin());
CREATE POLICY "tokens_update_admin" ON approval_tokens FOR UPDATE USING (is_super_admin());