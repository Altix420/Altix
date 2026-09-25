-- 008_rpc_functions.sql

-- 1. Abrir Caja
CREATE OR REPLACE FUNCTION abrir_caja(
    p_sucursal_id UUID,
    p_usuario_id UUID,
    p_monto_apertura NUMERIC
) RETURNS UUID AS $$
DECLARE
    v_sesion_id UUID;
BEGIN
    IF EXISTS (
        SELECT 1 FROM sesiones_caja 
        WHERE usuario_id = p_usuario_id AND estado = 'abierta'
    ) THEN
        RAISE EXCEPTION 'El usuario ya tiene una sesión de caja abierta.';
    END IF;

    INSERT INTO sesiones_caja (sucursal_id, usuario_id, monto_apertura)
    VALUES (p_sucursal_id, p_usuario_id, p_monto_apertura)
    RETURNING id INTO v_sesion_id;

    RETURN v_sesion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Cerrar Caja
CREATE OR REPLACE FUNCTION cerrar_caja(
    p_sesion_caja_id UUID,
    p_monto_cierre NUMERIC
) RETURNS VOID AS $$
BEGIN
    UPDATE sesiones_caja
    SET monto_cierre = p_monto_cierre,
        fecha_cierre = now(),
        estado = 'cerrada'
    WHERE id = p_sesion_caja_id AND estado = 'abierta';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La sesión de caja no existe o ya está cerrada.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Registrar Gasto
CREATE OR REPLACE FUNCTION registrar_gasto(
    p_sesion_caja_id UUID,
    p_sucursal_id UUID,
    p_categoria TEXT,
    p_monto NUMERIC,
    p_descripcion TEXT,
    p_comprobante_url TEXT,
    p_registrado_por UUID
) RETURNS UUID AS $$
DECLARE
    v_gasto_id UUID;
BEGIN
    INSERT INTO gastos (sesion_caja_id, sucursal_id, categoria, monto, descripcion, comprobante_url, registrado_por)
    VALUES (p_sesion_caja_id, p_sucursal_id, p_categoria, p_monto, p_descripcion, p_comprobante_url, p_registrado_por)
    RETURNING id INTO v_gasto_id;

    INSERT INTO movimientos_caja (sesion_caja_id, tipo, monto, concepto, referencia_id)
    VALUES (p_sesion_caja_id, 'egreso', p_monto, 'Gasto: ' || p_descripcion, v_gasto_id);

    RETURN v_gasto_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Convertir Cotización a Pedido
CREATE OR REPLACE FUNCTION convertir_cotizacion_pedido(
    p_cotizacion_id UUID
) RETURNS UUID AS $$
DECLARE
    v_cotizacion RECORD;
    v_pedido_id UUID;
    v_item RECORD;
BEGIN
    SELECT * INTO v_cotizacion FROM cotizaciones WHERE id = p_cotizacion_id AND estado = 'enviada';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cotización no encontrada o no está en estado enviada.';
    END IF;

    INSERT INTO pedidos (cotizacion_id, sucursal_id, cliente_id, vendedor_id, total, saldo_pendiente, estado)
    VALUES (v_cotizacion.id, v_cotizacion.sucursal_id, v_cotizacion.cliente_id, v_cotizacion.vendedor_id, v_cotizacion.total, v_cotizacion.total, 'pendiente')
    RETURNING id INTO v_pedido_id;

    FOR v_item IN SELECT * FROM cotizacion_items WHERE cotizacion_id = p_cotizacion_id
    LOOP
        INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario, subtotal, observaciones)
        VALUES (v_pedido_id, v_item.producto_id, v_item.cantidad, v_item.precio_unitario, v_item.subtotal, v_item.observaciones);
    END LOOP;

    UPDATE cotizaciones SET estado = 'convertida' WHERE id = p_cotizacion_id;

    RETURN v_pedido_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Registrar Anticipo de Pedido
CREATE OR REPLACE FUNCTION registrar_anticipo(
    p_pedido_id UUID,
    p_cliente_id UUID,
    p_monto NUMERIC,
    p_forma_pago metodo_pago,
    p_comprobante_ref TEXT
) RETURNS UUID AS $$
DECLARE
    v_anticipo_id UUID;
BEGIN
    INSERT INTO anticipos (pedido_id, cliente_id, monto, forma_pago, comprobante_ref)
    VALUES (p_pedido_id, p_cliente_id, p_monto, p_forma_pago, p_comprobante_ref)
    RETURNING id INTO v_anticipo_id;

    UPDATE pedidos 
    SET saldo_pendiente = GREATEST(0, saldo_pendiente - p_monto)
    WHERE id = p_pedido_id;

    RETURN v_anticipo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Generar Comisión según Reglas Escalonadas
CREATE OR REPLACE FUNCTION generar_comision(
    p_venta_id UUID
) RETURNS UUID AS $$
DECLARE
    v_venta RECORD;
    v_es_mayorista BOOLEAN;
    v_tipo_cliente TEXT;
    v_porcentaje NUMERIC(5,2) := 0.00;
    v_monto_comision NUMERIC(12,2) := 0.00;
    v_comision_id UUID;
    v_periodo TEXT;
BEGIN
    SELECT * INTO v_venta FROM ventas WHERE id = p_venta_id;
    SELECT es_mayorista INTO v_es_mayorista FROM clientes WHERE id = v_venta.cliente_id;

    IF v_es_mayorista THEN
        v_tipo_cliente := 'mayorista';
    ELSE
        v_tipo_cliente := 'cliente_final';
    END IF;

    SELECT porcentaje INTO v_porcentaje
    FROM reglas_comision
    WHERE tipo_cliente = v_tipo_cliente
      AND v_venta.total >= monto_min
      AND v_venta.total <= monto_max
      AND activa = true
    LIMIT 1;

    IF v_porcentaje IS NULL THEN
        v_porcentaje := 0.00;
    END IF;

    v_monto_comision := ROUND((v_venta.total * (v_porcentaje / 100.0)), 2);
    v_periodo := to_char(v_venta.created_at, 'YYYY-MM');

    INSERT INTO comisiones (vendedor_id, venta_id, monto_venta, porcentaje_aplicado, monto_comision, periodo)
    VALUES (v_venta.vendedor_id, v_venta.id, v_venta.total, v_porcentaje, v_monto_comision, v_periodo)
    RETURNING id INTO v_comision_id;

    RETURN v_comision_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Registrar Venta con Descuento de Inventario Automático
CREATE OR REPLACE FUNCTION registrar_venta(
    p_sucursal_id UUID,
    p_cliente_id UUID,
    p_vendedor_id UUID,
    p_sesion_caja_id UUID,
    p_total NUMERIC,
    p_tipo_pago TEXT,
    p_items JSONB,
    p_pedido_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_venta_id UUID;
    v_item JSONB;
    v_producto_id UUID;
    v_cantidad NUMERIC;
    v_precio NUMERIC;
    v_subtotal NUMERIC;
    v_stock_actual NUMERIC;
BEGIN
    INSERT INTO ventas (pedido_id, sucursal_id, cliente_id, vendedor_id, total)
    VALUES (p_pedido_id, p_sucursal_id, p_cliente_id, p_vendedor_id, p_total)
    RETURNING id INTO v_venta_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_producto_id := (v_item->>'producto_id')::UUID;
        v_cantidad := (v_item->>'cantidad')::NUMERIC;
        v_precio := (v_item->>'precio_unitario')::NUMERIC;
        v_subtotal := v_cantidad * v_precio;

        INSERT INTO venta_items (venta_id, producto_id, cantidad, precio_unitario, subtotal)
        VALUES (v_venta_id, v_producto_id, v_cantidad, v_precio, v_subtotal);

        SELECT stock INTO v_stock_actual 
        FROM inventarios 
        WHERE sucursal_id = p_sucursal_id AND producto_id = v_producto_id 
        FOR UPDATE;

        IF v_stock_actual IS NULL OR v_stock_actual < v_cantidad THEN
            RAISE EXCEPTION 'Stock insuficiente para el producto ID %', v_producto_id;
        END IF;

        UPDATE inventarios
        SET stock = stock - v_cantidad
        WHERE sucursal_id = p_sucursal_id AND producto_id = v_producto_id;

        INSERT INTO movimientos_inventario (
            sucursal_id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id
        ) VALUES (
            p_sucursal_id, v_producto_id, 'salida', v_cantidad, v_stock_actual, (v_stock_actual - v_cantidad), 'Venta ' || v_venta_id, p_vendedor_id
        );
    END LOOP;

    IF p_sesion_caja_id IS NOT NULL AND p_tipo_pago = 'efectivo' THEN
        INSERT INTO movimientos_caja (sesion_caja_id, tipo, monto, concepto, referencia_id)
        VALUES (p_sesion_caja_id, 'ingreso', p_total, 'Venta realizada', v_venta_id);
    END IF;

    PERFORM generar_comision(v_venta_id);

    RETURN v_venta_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
