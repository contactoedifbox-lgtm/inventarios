-- ============================================================
-- 008 — Creación TRANSACCIONAL de arriendos y ventas
-- ------------------------------------------------------------
-- Mueve toda la lógica de validación + inserción + cambio de
-- estado del traje a funciones RPC (SECURITY DEFINER).
-- PostgreSQL garantiza atomicidad: si cualquier paso falla,
-- TODA la operación se revierte (sin datos huérfanos).
-- Además, los locks FOR UPDATE evitan condiciones de carrera
-- en los contadores de límites por evento.
-- ============================================================

-- ---------- ARRIENDO ----------
CREATE OR REPLACE FUNCTION create_rental(
  p_costume_id UUID,
  p_renter_id  UUID,
  p_first_name TEXT,
  p_last_name  TEXT,
  p_rut        TEXT,
  p_phone      TEXT,
  p_email      TEXT,
  p_event_id   UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_costume        costumes%ROWTYPE;
  v_event          events%ROWTYPE;
  v_global_count   INTEGER;
  v_user_count     INTEGER;
  v_rental_id      UUID;
BEGIN
  -- 1. Traje: bloquear la fila para serializar solicitudes concurrentes
  SELECT * INTO v_costume FROM costumes WHERE id = p_costume_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El traje no existe';
  END IF;
  IF v_costume.type != 'rent' THEN
    RAISE EXCEPTION 'Este traje no está disponible para arriendo';
  END IF;
  IF v_costume.status != 'disponible' OR v_costume.is_sold THEN
    RAISE EXCEPTION 'El traje ya no está disponible';
  END IF;
  IF v_costume.owner_id = p_renter_id THEN
    RAISE EXCEPTION 'No puedes arrendar tu propio traje';
  END IF;

  -- 2. Evento: bloquear la fila (serializa el contador global)
  SELECT * INTO v_event FROM events WHERE id = p_event_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El evento no existe';
  END IF;
  IF v_event.is_archived THEN
    RAISE EXCEPTION 'El evento está archivado';
  END IF;
  IF v_event.event_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'El evento ya pasó';
  END IF;

  -- 3. El traje debe estar habilitado para ese evento
  IF NOT EXISTS (
    SELECT 1 FROM costume_events
    WHERE costume_id = p_costume_id AND event_id = p_event_id
  ) THEN
    RAISE EXCEPTION 'El traje no está habilitado para el evento seleccionado';
  END IF;

  -- 4. Límite global del evento
  SELECT COUNT(*) INTO v_global_count
  FROM rentals WHERE event_id = p_event_id;

  IF v_global_count >= v_event.max_global_rentals THEN
    RAISE EXCEPTION 'Este evento alcanzó el máximo de arriendos permitidos';
  END IF;

  -- 5. Límite por usuario en el evento
  SELECT COUNT(*) INTO v_user_count
  FROM rentals WHERE event_id = p_event_id AND renter_id = p_renter_id;

  IF v_user_count >= v_event.max_user_rentals THEN
    RAISE EXCEPTION 'Ya tienes un traje arrendado para este evento';
  END IF;

  -- 6. Insert + update en la misma transacción (atómico)
  INSERT INTO rentals (
    costume_id, renter_id, first_name, last_name, rut, phone, email, event_id, status
  ) VALUES (
    p_costume_id, p_renter_id, p_first_name, p_last_name, p_rut, p_phone, p_email, p_event_id, 'reservado'
  )
  RETURNING id INTO v_rental_id;

  UPDATE costumes
  SET status = 'reservado', updated_at = now()
  WHERE id = p_costume_id;

  RETURN v_rental_id;
END;
$$;

-- ---------- VENTA ----------
CREATE OR REPLACE FUNCTION create_sale(
  p_costume_id UUID,
  p_buyer_id   UUID,
  p_first_name TEXT,
  p_last_name  TEXT,
  p_rut        TEXT,
  p_phone      TEXT,
  p_email      TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_costume  costumes%ROWTYPE;
  v_sale_id  UUID;
BEGIN
  -- Bloquear la fila del traje para serializar compras concurrentes
  SELECT * INTO v_costume FROM costumes WHERE id = p_costume_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El traje no existe';
  END IF;
  IF v_costume.type != 'sale' THEN
    RAISE EXCEPTION 'Este traje no está en venta';
  END IF;
  IF v_costume.status != 'disponible' OR v_costume.is_sold THEN
    RAISE EXCEPTION 'El traje ya no está disponible';
  END IF;
  IF v_costume.owner_id = p_buyer_id THEN
    RAISE EXCEPTION 'No puedes comprar tu propio traje';
  END IF;

  -- Insert + update atómico
  INSERT INTO sales (
    costume_id, buyer_id, first_name, last_name, rut, phone, email, status
  ) VALUES (
    p_costume_id, p_buyer_id, p_first_name, p_last_name, p_rut, p_phone, p_email, 'reservado'
  )
  RETURNING id INTO v_sale_id;

  UPDATE costumes
  SET status = 'reservado', updated_at = now()
  WHERE id = p_costume_id;

  RETURN v_sale_id;
END;
$$;

-- Solo usuarios autenticados pueden invocarlas
REVOKE ALL ON FUNCTION create_rental(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION create_sale(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_rental(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_sale(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_rental(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION create_sale(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;