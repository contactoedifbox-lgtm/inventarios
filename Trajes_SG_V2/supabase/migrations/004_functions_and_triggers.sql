-- ============================================================
-- 004_functions_and_triggers.sql
-- Caporales San Gabriel — Funciones y triggers de negocio
-- ============================================================

-- Trigger: updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_costumes_updated_at
  BEFORE UPDATE ON costumes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_rentals_updated_at
  BEFORE UPDATE ON rentals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sales_updated_at
  BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger: solo trajes tipo 'rent' pueden tener costume_events
CREATE OR REPLACE FUNCTION validate_costume_type_for_event()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT type FROM costumes WHERE id = NEW.costume_id) != 'rent' THEN
    RAISE EXCEPTION 'Solo trajes de tipo rent pueden asociarse a eventos';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_costume_event
  BEFORE INSERT ON costume_events FOR EACH ROW EXECUTE FUNCTION validate_costume_type_for_event();

-- Función: confirmar venta (soft delete)
CREATE OR REPLACE FUNCTION confirm_sale(p_sale_id UUID, p_admin_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_costume_id UUID;
BEGIN
  SELECT costume_id INTO v_costume_id FROM sales WHERE id = p_sale_id;
  IF v_costume_id IS NULL THEN
    RAISE EXCEPTION 'Venta no encontrada: %', p_sale_id;
  END IF;
  UPDATE sales    SET status = 'completado', updated_at = now() WHERE id = p_sale_id;
  UPDATE costumes SET is_sold = true,        updated_at = now() WHERE id = v_costume_id;
END;
$$;

-- Función: revertir traje a 'disponible' post-evento
CREATE OR REPLACE FUNCTION reset_costumes_post_event()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE costumes SET status = 'disponible', updated_at = now()
  WHERE status = 'arrendado'
    AND id IN (
      SELECT DISTINCT r.costume_id
      FROM rentals r
      JOIN events e ON r.event_id = e.id
      WHERE e.event_date < CURRENT_DATE
        AND r.status = 'arrendado'
    );
END;
$$;

-- Función auxiliar: contar arriendos activos de un evento (para límites)
CREATE OR REPLACE FUNCTION count_event_rentals(p_event_id UUID)
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COUNT(*)::INTEGER FROM rentals WHERE event_id = p_event_id;
$$;

-- Función auxiliar: contar arriendos de un usuario en un evento (para límites)
CREATE OR REPLACE FUNCTION count_user_event_rentals(p_event_id UUID, p_renter_id UUID)
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COUNT(*)::INTEGER FROM rentals WHERE event_id = p_event_id AND renter_id = p_renter_id;
$$;