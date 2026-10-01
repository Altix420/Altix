import { supabase } from '../shared/supabase';
import type { Database, Json } from '../shared/types/database.types';

export interface VentaItemInput {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
}

export interface RegistrarVentaInput {
  sucursal_id: string;
  cliente_id: string;
  vendedor_id: string;
  sesion_caja_id?: string;
  total: number;
  tipo_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'credito';
  items: VentaItemInput[];
  pedido_id?: string;
  operation_id?: string;
}

type RegistrarVentaArgs = Database['public']['Functions']['registrar_venta']['Args'];

export const registrarVentaService = async (input: RegistrarVentaInput): Promise<string> => {
  if (input.tipo_pago !== 'credito' && !input.sesion_caja_id) {
    throw new Error('La venta requiere una sesión de caja chica abierta para pagos de contado.');
  }

  if (!input.items || input.items.length === 0) {
    throw new Error('La orden de venta debe incluir al menos un producto.');
  }

  const rpcArgs: RegistrarVentaArgs = {
    p_sucursal_id: input.sucursal_id,
    p_cliente_id: input.cliente_id,
    p_vendedor_id: input.vendedor_id,
    p_total: input.total,
    p_tipo_pago: input.tipo_pago,
    p_items: input.items as unknown as Json
  };

  if (input.sesion_caja_id) rpcArgs.p_sesion_caja_id = input.sesion_caja_id;
  if (input.pedido_id) rpcArgs.p_pedido_id = input.pedido_id;
  if (input.operation_id) rpcArgs.p_operation_id = input.operation_id;

  const { data, error } = await supabase.rpc('registrar_venta', rpcArgs);

  if (error) {
    throw new Error(`Error en registrar_venta: ${error.message}`);
  }

  return data as string;
};
