import { supabase } from '../shared/lib/supabase';
import { createOperationId } from '../shared/operation-id';
import { registrarVentaService, type VentaItemInput } from '../comercial/ventas.service';
import type { Database, Json } from '../shared/types/database.types';

type FunctionArgs<Name extends keyof Database['public']['Functions']> = Database['public']['Functions'][Name]['Args'];

export const vendorService = {
  registrarVenta: (input: Omit<Parameters<typeof registrarVentaService>[0], 'operation_id'> & { items: VentaItemInput[] }) => registrarVentaService({ ...input, operation_id: createOperationId('venta') }),
  crearCotizacion: (input: Omit<FunctionArgs<'crear_cotizacion'>, 'p_vendedor_id' | 'p_operation_id'> & { p_vendedor_id: string }) =>
    supabase.rpc('crear_cotizacion', {
      ...input,
      p_items: input.p_items as Json,
      p_operation_id: createOperationId('cotizacion'),
    } as never).then(({ data, error }) => {
      if (error) throw new Error(error.message);
      return data as string;
    }),
  convertirCotizacion: (p_cotizacion_id: string) =>
    supabase.rpc('convertir_cotizacion_pedido', { p_cotizacion_id }).then(({ data, error }) => {
      if (error) throw new Error(error.message);
      return data as string;
    }),
  confirmarPedidoVenta: (args: FunctionArgs<'confirmar_pedido_venta'>) =>
    supabase.rpc('confirmar_pedido_venta', args).then(({ data, error }) => {
      if (error) throw new Error(error.message);
      return data as string;
    }),
  cancelarCotizacionRechazada: async (p_cotizacion_id: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('No hay un vendedor autenticado.');
    const { data, error } = await supabase
      .from('cotizaciones')
      .update({ estado: 'cancelada' })
      .eq('id', p_cotizacion_id)
      .eq('vendedor_id', userId)
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    return data.id;
  },
  registrarAceptacion: (args: Omit<FunctionArgs<'registrar_aceptacion_cotizacion'>, 'p_registrado_por' | 'p_operation_id'>) =>
    supabase.rpc('registrar_aceptacion_cotizacion', {
      ...args,
      p_operation_id: createOperationId('aceptacion-cotizacion'),
    }).then(({ data, error }) => {
      if (error) throw new Error(error.message);
      return data as string;
    }),
  solicitarAprobacion: (args: Omit<FunctionArgs<'solicitar_aprobacion'>, 'p_solicitante_id' | 'p_operation_id'> & { p_solicitante_id: string }) =>
    supabase.rpc('solicitar_aprobacion', {
      ...args,
      p_operation_id: createOperationId('aprobacion'),
    } as never).then(({ data, error }) => {
      if (error) throw new Error(error.message);
      return data as string;
    }),
  abrirCaja: (args: FunctionArgs<'abrir_caja'>) => supabase.rpc('abrir_caja', args).then(({ data, error }) => { if (error) throw new Error(error.message); return data as string; }),
  cerrarCaja: (args: FunctionArgs<'cerrar_caja'>) => supabase.rpc('cerrar_caja', args).then(({ data, error }) => { if (error) throw new Error(error.message); return data as Json; }),
  registrarAnticipo: (args: FunctionArgs<'registrar_anticipo_v1'>) => supabase.rpc('registrar_anticipo_v1', args).then(({ data, error }) => { if (error) throw new Error(error.message); return data as string; }),
  registrarGasto: (args: FunctionArgs<'registrar_gasto'>) => supabase.rpc('registrar_gasto', args).then(({ data, error }) => { if (error) throw new Error(error.message); return data as string; }),
  registrarPago: (args: FunctionArgs<'registrar_pago'>) => supabase.rpc('registrar_pago', args).then(({ data, error }) => { if (error) throw new Error(error.message); return data as string; }),
  solicitarCredito: (args: FunctionArgs<'solicitar_credito_cliente'>) => supabase.rpc('solicitar_credito_cliente', args).then(({ error }) => { if (error) throw new Error(error.message); }),
  crearClienteMayorista: (args: FunctionArgs<'crear_cliente_mayorista'>) => supabase.rpc('crear_cliente_mayorista', args).then(({ data, error }) => { if (error) throw new Error(error.message); return data as string; }),
  async crearCliente(input: { nombre: string; nit_dpi?: string; telefono?: string; direccion?: string; es_mayorista: boolean }) {
    const { data, error } = await supabase.from('clientes').insert({
      nombre: input.nombre.trim(),
      nit_dpi: input.nit_dpi?.trim() || null,
      telefono: input.telefono?.trim() || null,
      direccion: input.direccion?.trim() || null,
      es_mayorista: input.es_mayorista,
      monto_solicitado: 0,
    }).select('id').single();
    if (error) throw error;
    return data.id;
  }
};
