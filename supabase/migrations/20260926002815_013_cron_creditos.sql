-- 013_cron_creditos.sql

CREATE OR REPLACE FUNCTION revisar_vencimientos_credito() RETURNS VOID AS $$
DECLARE
    v_cuenta RECORD;
BEGIN
    FOR v_cuenta IN 
        SELECT id, cliente_id, fecha_vencimiento, saldo_pendiente 
        FROM cuentas_cobrar 
        WHERE fecha_vencimiento = CURRENT_DATE + INTERVAL '1 day' 
          AND estado IN ('pendiente', 'parcial')
    LOOP
        INSERT INTO recordatorios (cliente_id, cuenta_cobrar_id, fecha_recordatorio, nota)
        VALUES (v_cuenta.cliente_id, v_cuenta.id, CURRENT_DATE, 'Crédito por vencer mañana. Saldo pendiente: Q' || v_cuenta.saldo_pendiente)
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
