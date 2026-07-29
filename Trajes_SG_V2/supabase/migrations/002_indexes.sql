-- ============================================================
-- 002_indexes.sql
-- Caporales San Gabriel — Índices de rendimiento
-- ============================================================

CREATE INDEX idx_profiles_role       ON profiles(role);
CREATE INDEX idx_profiles_rut        ON profiles(rut);
CREATE INDEX idx_costumes_owner      ON costumes(owner_id);
CREATE INDEX idx_costumes_type       ON costumes(type);
CREATE INDEX idx_costumes_status     ON costumes(status) WHERE is_sold = false;
CREATE INDEX idx_costume_events_evt  ON costume_events(event_id);
CREATE INDEX idx_rentals_costume     ON rentals(costume_id);
CREATE INDEX idx_rentals_renter      ON rentals(renter_id);
CREATE INDEX idx_rentals_event       ON rentals(event_id);
CREATE INDEX idx_sales_costume       ON sales(costume_id);
CREATE INDEX idx_sales_buyer         ON sales(buyer_id);
CREATE INDEX idx_audit_admin         ON audit_logs(admin_id);
CREATE INDEX idx_audit_target        ON audit_logs(target_user_id);
CREATE INDEX idx_approval_tokens_usr ON approval_tokens(target_user_id) WHERE used = false;