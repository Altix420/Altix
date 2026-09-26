-- 012_rpc_faltantes_y_concurrencia.sql

-- 1. Registrar Pago de Crédito
CREATE OR REPLACE FUNCTION registrar_pago(
    p_cuenta_cobrar_id UUID,
    p_monto NUMERIC,
    p_forma_pago metodo_pago,
    p_referencia TEXT,
    p_registrado_por UUID,
    p_sesion_caja_id UUID DEFAULT NULL,
    p_operation_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_cuenta RECORD;
    v_pago_id UUID;
    v_nuevo_saldo NUMERIC;
BEGIN
    SELECT * INTO v_cuenta FROM cuentas_cobrar WHERE id = p_cuenta_cobrar_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La cuenta por cobrar no existe.';
    END IF;

    IF p_monto <= 0 THEN
        RAISE EXCEPTION 'El monto del pago debe ser mayor a cero.';
    END IF;

    IF p_monto > v_cuenta.saldo_pendiente THEN
        RAISE EXCEPTION 'El pago excede el saldo pendiente (Q%).', v_cuenta.saldo_pendiente;
    END IF;

    INSERT INTO pagos_credito (cuenta_cobrar_id, monto, forma_pago, referencia, registrado_por)
    VALUES (p_cuenta_cobrar_id, p_monto, p_forma_pago, p_referencia, p_registrado_por)
    RETURNING id INTO v_pago_id;

    v_nuevo_saldo := v_cuenta.saldo_pendiente - p_monto;
    UPDATE cuentas_cobrar 
    SET saldo_pendiente = v_nuevo_saldo,
        estado = CASE WHEN v_nuevo_saldo = 0 THEN 'pagada'::estado_cuenta ELSE 'parcial'::estado_cuenta END
    WHERE id = p_cuenta_cobrar_id;

    IF p_sesion_caja_id IS NOT NULL AND p_forma_pago = 'efectivo' THEN
        INSERT INTO movimientos_caja (sesion_caja_id, tipo, monto, concepto, referencia_id, operation_id)
        VALUES (p_sesion_caja_id, 'ingreso', p_monto, 'Pago a crédito', v_pago_id, p_operation_id);
    END IF;

    INSERT INTO bitacora_auditoria (usuario_id, accion, tabla_afectada, registro_id, datos_nuevos)
    VALUES (p_registrado_por, 'PAGO_CREDITO', 'cuentas_cobrar', p_cuenta_cobrar_id, jsonb_build_object('monto', p_monto, 'saldo_restante', v_nuevo_saldo));

    RETURN v_pago_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Aplicar Saldo a Favor con bloqueo estricto
CREATE OR REPLACE FUNCTION aplicar_saldo_favor(
    p_cliente_id UUID,
    p_monto NUMERIC,
    p_concepto TEXT,
    p_referencia_id UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_saldo RECORD;
BEGIN
    SELECT * INTO v_saldo FROM saldos_favor WHERE cliente_id = p_cliente_id FOR UPDATE;
    
    IF NOT FOUND OR v_saldo.saldo_disponible < p_monto THEN
        RAISE EXCEPTION 'Saldo a favor insuficiente para el cliente.';
    END IF;

    UPDATE saldos_favor 
    SET saldo_disponible = saldo_disponible - p_monto,
        updated_at = now()
    WHERE cliente_id = p_cliente_id;

    INSERT INTO movimientos_saldo_favor (saldo_favor_id, monto, tipo, concepto, referencia_id)
    VALUES (v_saldo.id, p_monto, 'debito', p_concepto, p_referencia_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Entrada de Inventario
CREATE OR REPLACE FUNCTION registrar_entrada_inventario(
    p_sucursal_id UUID,
    p_producto_id UUID,
    p_cantidad NUMERIC,
    p_motivo TEXT,
    p_usuario_id UUID
) RETURNS VOID AS $$
DECLARE
    v_stock_actual NUMERIC := 0.00;
BEGIN
    SELECT stock INTO v_stock_actual 
    FROM inventarios 
    WHERE sucursal_id = p_sucursal_id AND producto_id = p_producto_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO inventarios (sucursal_id, producto_id, stock)
        VALUES (p_sucursal_id, p_producto_id, p_cantidad);
    ELSE
        UPDATE inventarios 
        SET stock = stock + p_cantidad 
        WHERE sucursal_id = p_sucursal_id AND producto_id = p_producto_id;
    END IF;

    INSERT INTO movimientos_inventario (
        sucursal_id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id
    ) VALUES (
        p_sucursal_id, p_producto_id, 'entrada', p_cantidad, v_stock_actual, (v_stock_actual + p_cantidad), p_motivo, p_usuario_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Traslado entre sucursales
CREATE OR REPLACE FUNCTION trasladar_inventario(
    p_sucursal_origen_id UUID,
    p_sucursal_destino_id UUID,
    p_producto_id UUID,
    p_cantidad NUMERIC,
    p_solicitado_por UUID,
    p_operation_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_stock_origen NUMERIC;
    v_traslado_id UUID;
BEGIN
    SELECT stock INTO v_stock_origen 
    FROM inventarios 
    WHERE sucursal_id = p_sucursal_origen_id AND producto_id = p_producto_id 
    FOR UPDATE;

    IF v_stock_origen IS NULL OR v_stock_origen < p_cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente en sucursal de origen para realizar el traslado.';
    END IF;

    -- Descontar origen
    UPDATE inventarios SET stock = stock - p_cantidad WHERE sucursal_id = p_sucursal_origen_id AND producto_id = p_producto_id;

    -- Registrar traslado
    INSERT INTO traslados (sucursal_origen_id, sucursal_destino_id, estado, solicitado_por, operation_id)
    VALUES (p_sucursal_origen_id, p_sucursal_destino_id, 'recibido', p_solicitado_por, p_operation_id)
    RETURNING id INTO v_traslado_id;

    -- Aumentar destino
    INSERT INTO inventarios (sucursal_id, producto_id, stock)
    VALUES (p_sucursal_destino_id, p_producto_id, p_cantidad)
    ON CONFLICT (sucursal_id, producto_id) 
    DO UPDATE SET stock = inventarios.stock + EXCLUDED.stock;

    RETURN v_traslado_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Devoluciones completas
CREATE OR REPLACE FUNCTION registrar_devolucion(
    p_venta_id UUID,
    p_motivo TEXT,
    p_autorizado_por UUID,
    p_items JSONB,
    p_operation_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_venta RECORD;
    v_devolucion_id UUID;
    v_item JSONB;
    v_monto_total NUMERIC := 0.00;
    v_prod_id UUID;
    v_cant NUMERIC;
    v_precio NUMERIC;
BEGIN
    SELECT * INTO v_venta FROM ventas WHERE id = p_venta_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La venta original no existe.';
    END IF;

    -- Calcular total
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_monto_total := v_monto_total + ((v_item->>'cantidad')::NUMERIC * (v_item->>'precio_unitario')::NUMERIC);
    END LOOP;

    INSERT INTO devoluciones (venta_id, sucursal_id, cliente_id, monto_total, motivo, autorizado_por, operation_id)
    VALUES (p_venta_id, v_venta.sucursal_id, v_venta.cliente_id, v_monto_total, p_motivo, p_autorizado_por, p_operation_id)
    RETURNING id INTO v_devolucion_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_prod_id := (v_item->>'producto_id')::UUID;
        v_cant := (v_item->>'cantidad')::NUMERIC;
        v_precio := (v_item->>'precio_unitario')::NUMERIC;

        INSERT INTO devolucion_items (devolucion_id, producto_id, cantidad, precio_unitario, subtotal)
        VALUES (v_devolucion_id, v_prod_id, v_cant, v_precio, (v_cant * v_precio));

        -- Restaurar stock
        UPDATE inventarios SET stock = stock + v_cant WHERE sucursal_id = v_venta.sucursal_id AND producto_id = v_prod_id;
    END LOOP;

    -- Generar saldo a favor al cliente
    INSERT INTO saldos_favor (cliente_id, saldo_disponible)
    VALUES (v_venta.cliente_id, v_monto_total)
    ON CONFLICT (cliente_id) DO UPDATE SET saldo_disponible = saldos_favor.saldo_disponible + v_monto_total;

    -- Log Auditoría
    INSERT INTO bitacora_auditoria (usuario_id, accion, tabla_afectada, registro_id, datos_nuevos)
    VALUES (p_autorizado_por, 'DEVOLUCION_VENTA', 'ventas', p_venta_id, jsonb_build_object('monto', v_monto_total, 'devolucion_id', v_devolucion_id));

    RETURN v_devolucion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Guardar Lote de Conteo Físico
CREATE OR REPLACE FUNCTION guardar_conteo_batch(
    p_conteo_id UUID,
    p_items JSONB
) RETURNS VOID AS $$
DECLARE
    v_item JSONB;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        INSERT INTO conteos_detalle (conteo_id, producto_id, stock_sistema, stock_fisico)
        VALUES (
            p_conteo_id,
            (v_item->>'producto_id')::UUID,
            (v_item->>'stock_sistema')::NUMERIC,
            (v_item->>'stock_fisico')::NUMERIC
        );
    END LOOP;

    UPDATE conteos SET estado = 'finalizado' WHERE id = p_conteo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Marcar Entrega
CREATE OR REPLACE FUNCTION marcar_entrega(
    p_pedido_id UUID,
    p_recibido_por TEXT,
    p_observaciones TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_entrega_id UUID;
BEGIN
    INSERT INTO entregas (pedido_id, recibido_por, observaciones)
    VALUES (p_pedido_id, p_recibido_por, p_observaciones)
    RETURNING id INTO v_entrega_id;

    UPDATE pedidos SET estado = 'entregado' WHERE id = p_pedido_id;

    RETURN v_entrega_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Reasignar Cartera de Vendedor
CREATE OR REPLACE FUNCTION reasignar_cartera(
    p_vendedor_origen_id UUID,
    p_vendedor_destino_id UUID,
    p_autorizado_por UUID
) RETURNS VOID AS $$
BEGIN
    UPDATE cotizaciones SET vendedor_id = p_vendedor_destino_id WHERE vendedor_id = p_vendedor_origen_id AND estado = 'enviada';
    UPDATE pedidos SET vendedor_id = p_vendedor_destino_id WHERE vendedor_id = p_vendedor_origen_id AND estado NOT IN ('entregado', 'cancelado');

    INSERT INTO bitacora_auditoria (usuario_id, accion, tabla_afectada, registro_id, datos_nuevos)
    VALUES (p_autorizado_por, 'REASIGNACION_CARTERA', 'profiles', p_vendedor_origen_id, jsonb_build_object('nuevo_vendedor_id', p_vendedor_destino_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
