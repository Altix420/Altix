
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "public": {
          Tables: {
            "ajustes_comision": {
                  Row: {
                    "aprobado_por": string | null,"comision_id": string | null,"created_at": string | null,"id": string,"monto_ajuste": number,"motivo": string,"operation_id": string | null
                  }
                  Insert: {
                    "aprobado_por"?: string | null,"comision_id"?: string | null,"created_at"?: string | null,"id"?: string,"monto_ajuste": number,"motivo": string,"operation_id"?: string | null
                  }
                  Update: {
                    "aprobado_por"?: string | null,"comision_id"?: string | null,"created_at"?: string | null,"id"?: string,"monto_ajuste"?: number,"motivo"?: string,"operation_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ajustes_comision_aprobado_por_fkey"
      columns: ["aprobado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ajustes_comision_comision_id_fkey"
      columns: ["comision_id"]
isOneToOne: false
      referencedRelation: "comisiones"
      referencedColumns: ["id"]
    }
                  ]
                },"anticipos": {
                  Row: {
                    "cliente_id": string | null,"comprobante_ref": string | null,"created_at": string | null,"forma_pago": Database["public"]['Enums']["metodo_pago"],"id": string,"monto": number,"operation_id": string | null,"pedido_id": string | null,"registrado_por": string | null,"sesion_caja_id": string | null
                  }
                  Insert: {
                    "cliente_id"?: string | null,"comprobante_ref"?: string | null,"created_at"?: string | null,"forma_pago"?: Database["public"]['Enums']["metodo_pago"],"id"?: string,"monto": number,"operation_id"?: string | null,"pedido_id"?: string | null,"registrado_por"?: string | null,"sesion_caja_id"?: string | null
                  }
                  Update: {
                    "cliente_id"?: string | null,"comprobante_ref"?: string | null,"created_at"?: string | null,"forma_pago"?: Database["public"]['Enums']["metodo_pago"],"id"?: string,"monto"?: number,"operation_id"?: string | null,"pedido_id"?: string | null,"registrado_por"?: string | null,"sesion_caja_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "anticipos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "anticipos_pedido_id_fkey"
      columns: ["pedido_id"]
isOneToOne: false
      referencedRelation: "pedidos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "anticipos_registrado_por_fkey"
      columns: ["registrado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "anticipos_sesion_caja_id_fkey"
      columns: ["sesion_caja_id"]
isOneToOne: false
      referencedRelation: "sesiones_caja"
      referencedColumns: ["id"]
    }
                  ]
                },"aprobaciones": {
                  Row: {
                    "created_at": string,"datos_solicitados": NonNullable<Json>,"estado": string,"id": string,"motivo": string,"nota_resolucion": string | null,"operation_id": string | null,"referencia_id": string | null,"referencia_tabla": string | null,"revisado_at": string | null,"revisado_por": string | null,"solicitante_id": string,"solicitante_visto_at": string | null,"sucursal_id": string,"tipo": string,"valor_solicitado": number | null
                  }
                  Insert: {
                    "created_at"?: string,"datos_solicitados"?: NonNullable<Json>,"estado"?: string,"id"?: string,"motivo": string,"nota_resolucion"?: string | null,"operation_id"?: string | null,"referencia_id"?: string | null,"referencia_tabla"?: string | null,"revisado_at"?: string | null,"revisado_por"?: string | null,"solicitante_id": string,"solicitante_visto_at"?: string | null,"sucursal_id": string,"tipo": string,"valor_solicitado"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"datos_solicitados"?: NonNullable<Json>,"estado"?: string,"id"?: string,"motivo"?: string,"nota_resolucion"?: string | null,"operation_id"?: string | null,"referencia_id"?: string | null,"referencia_tabla"?: string | null,"revisado_at"?: string | null,"revisado_por"?: string | null,"solicitante_id"?: string,"solicitante_visto_at"?: string | null,"sucursal_id"?: string,"tipo"?: string,"valor_solicitado"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "aprobaciones_revisado_por_fkey"
      columns: ["revisado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "aprobaciones_solicitante_id_fkey"
      columns: ["solicitante_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "aprobaciones_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    }
                  ]
                },"archivos": {
                  Row: {
                    "bucket": string,"created_at": string,"created_by": string | null,"id": string,"mime_type": string,"nombre_original": string,"path": string,"size_bytes": number
                  }
                  Insert: {
                    "bucket"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"mime_type": string,"nombre_original": string,"path": string,"size_bytes": number
                  }
                  Update: {
                    "bucket"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"mime_type"?: string,"nombre_original"?: string,"path"?: string,"size_bytes"?: number
                  }
                  Relationships: [

                  ]
                },"bitacora_auditoria": {
                  Row: {
                    "accion": string,"created_at": string | null,"datos_anteriores": Json | null,"datos_nuevos": Json | null,"id": string,"registro_id": string | null,"sucursal_id": string | null,"tabla_afectada": string,"usuario_id": string | null
                  }
                  Insert: {
                    "accion": string,"created_at"?: string | null,"datos_anteriores"?: Json | null,"datos_nuevos"?: Json | null,"id"?: string,"registro_id"?: string | null,"sucursal_id"?: string | null,"tabla_afectada": string,"usuario_id"?: string | null
                  }
                  Update: {
                    "accion"?: string,"created_at"?: string | null,"datos_anteriores"?: Json | null,"datos_nuevos"?: Json | null,"id"?: string,"registro_id"?: string | null,"sucursal_id"?: string | null,"tabla_afectada"?: string,"usuario_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "bitacora_auditoria_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bitacora_auditoria_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"categorias": {
                  Row: {
                    "created_at": string | null,"descripcion": string | null,"id": string,"nombre": string
                  }
                  Insert: {
                    "created_at"?: string | null,"descripcion"?: string | null,"id"?: string,"nombre": string
                  }
                  Update: {
                    "created_at"?: string | null,"descripcion"?: string | null,"id"?: string,"nombre"?: string
                  }
                  Relationships: [

                  ]
                },"clientes": {
                  Row: {
                    "activo": boolean | null,"created_at": string | null,"dias_credito": number,"direccion": string | null,"es_mayorista": boolean | null,"id": string,"monto_autorizado": number,"monto_solicitado": number,"nit_dpi": string | null,"nombre": string,"telefono": string | null
                  }
                  Insert: {
                    "activo"?: boolean | null,"created_at"?: string | null,"dias_credito"?: number,"direccion"?: string | null,"es_mayorista"?: boolean | null,"id"?: string,"monto_autorizado"?: number,"monto_solicitado"?: number,"nit_dpi"?: string | null,"nombre": string,"telefono"?: string | null
                  }
                  Update: {
                    "activo"?: boolean | null,"created_at"?: string | null,"dias_credito"?: number,"direccion"?: string | null,"es_mayorista"?: boolean | null,"id"?: string,"monto_autorizado"?: number,"monto_solicitado"?: number,"nit_dpi"?: string | null,"nombre"?: string,"telefono"?: string | null
                  }
                  Relationships: [

                  ]
                },"comisiones": {
                  Row: {
                    "created_at": string | null,"estado": string | null,"id": string,"monto_comision": number,"monto_venta": number,"periodo": string,"porcentaje_aplicado": number,"vendedor_id": string | null,"venta_id": string | null
                  }
                  Insert: {
                    "created_at"?: string | null,"estado"?: string | null,"id"?: string,"monto_comision": number,"monto_venta": number,"periodo": string,"porcentaje_aplicado": number,"vendedor_id"?: string | null,"venta_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"estado"?: string | null,"id"?: string,"monto_comision"?: number,"monto_venta"?: number,"periodo"?: string,"porcentaje_aplicado"?: number,"vendedor_id"?: string | null,"venta_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "comisiones_vendedor_id_fkey"
      columns: ["vendedor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comisiones_venta_id_fkey"
      columns: ["venta_id"]
isOneToOne: false
      referencedRelation: "ventas"
      referencedColumns: ["id"]
    }
                  ]
                },"conteos": {
                  Row: {
                    "created_at": string | null,"estado": string | null,"id": string,"realizado_por": string | null,"sucursal_id": string | null
                  }
                  Insert: {
                    "created_at"?: string | null,"estado"?: string | null,"id"?: string,"realizado_por"?: string | null,"sucursal_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"estado"?: string | null,"id"?: string,"realizado_por"?: string | null,"sucursal_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "conteos_realizado_por_fkey"
      columns: ["realizado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conteos_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    }
                  ]
                },"conteos_detalle": {
                  Row: {
                    "conteo_id": string | null,"diferencia": number | null,"id": string,"producto_id": string | null,"stock_fisico": number,"stock_sistema": number
                  }
                  Insert: {
                    "conteo_id"?: string | null,"diferencia"?: never,"id"?: string,"producto_id"?: string | null,"stock_fisico": number,"stock_sistema": number
                  }
                  Update: {
                    "conteo_id"?: string | null,"diferencia"?: never,"id"?: string,"producto_id"?: string | null,"stock_fisico"?: number,"stock_sistema"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "conteos_detalle_conteo_id_fkey"
      columns: ["conteo_id"]
isOneToOne: false
      referencedRelation: "conteos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conteos_detalle_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    }
                  ]
                },"cotizacion_item_extras": {
                  Row: {
                    "cotizacion_item_id": string,"extra_id": string,"precio_adicional": number
                  }
                  Insert: {
                    "cotizacion_item_id": string,"extra_id": string,"precio_adicional": number
                  }
                  Update: {
                    "cotizacion_item_id"?: string,"extra_id"?: string,"precio_adicional"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "cotizacion_item_extras_cotizacion_item_id_fkey"
      columns: ["cotizacion_item_id"]
isOneToOne: false
      referencedRelation: "cotizacion_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cotizacion_item_extras_extra_id_fkey"
      columns: ["extra_id"]
isOneToOne: false
      referencedRelation: "extras"
      referencedColumns: ["id"]
    }
                  ]
                },"cotizacion_items": {
                  Row: {
                    "cantidad": number,"cotizacion_id": string | null,"descuento": number,"diseno_id": string | null,"extra_id": string | null,"id": string,"observaciones": string | null,"precio_unitario": number,"producto_id": string | null,"snapshot_economico": NonNullable<Json>,"subtotal": number,"unidad_venta_snapshot": string
                  }
                  Insert: {
                    "cantidad"?: number,"cotizacion_id"?: string | null,"descuento"?: number,"diseno_id"?: string | null,"extra_id"?: string | null,"id"?: string,"observaciones"?: string | null,"precio_unitario": number,"producto_id"?: string | null,"snapshot_economico"?: NonNullable<Json>,"subtotal": number,"unidad_venta_snapshot"?: string
                  }
                  Update: {
                    "cantidad"?: number,"cotizacion_id"?: string | null,"descuento"?: number,"diseno_id"?: string | null,"extra_id"?: string | null,"id"?: string,"observaciones"?: string | null,"precio_unitario"?: number,"producto_id"?: string | null,"snapshot_economico"?: NonNullable<Json>,"subtotal"?: number,"unidad_venta_snapshot"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cotizacion_items_cotizacion_id_fkey"
      columns: ["cotizacion_id"]
isOneToOne: false
      referencedRelation: "cotizaciones"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cotizacion_items_diseno_id_fkey"
      columns: ["diseno_id"]
isOneToOne: false
      referencedRelation: "disenos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cotizacion_items_extra_id_fkey"
      columns: ["extra_id"]
isOneToOne: false
      referencedRelation: "extras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cotizacion_items_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    }
                  ]
                },"cotizaciones": {
                  Row: {
                    "aceptacion_operation_id": string | null,"aceptado_at": string | null,"aceptado_por": string | null,"cliente_acepto": boolean,"cliente_id": string | null,"created_at": string | null,"estado": Database["public"]['Enums']["estado_cotizacion"] | null,"id": string,"metodo_aceptacion": string | null,"metodo_pago": Database["public"]['Enums']["metodo_pago"],"nota_aceptacion": string | null,"observaciones": string | null,"operation_id": string | null,"sucursal_id": string | null,"total": number,"valida_hasta": string | null,"vendedor_id": string | null
                  }
                  Insert: {
                    "aceptacion_operation_id"?: string | null,"aceptado_at"?: string | null,"aceptado_por"?: string | null,"cliente_acepto"?: boolean,"cliente_id"?: string | null,"created_at"?: string | null,"estado"?: Database["public"]['Enums']["estado_cotizacion"] | null,"id"?: string,"metodo_aceptacion"?: string | null,"metodo_pago"?: Database["public"]['Enums']["metodo_pago"],"nota_aceptacion"?: string | null,"observaciones"?: string | null,"operation_id"?: string | null,"sucursal_id"?: string | null,"total"?: number,"valida_hasta"?: string | null,"vendedor_id"?: string | null
                  }
                  Update: {
                    "aceptacion_operation_id"?: string | null,"aceptado_at"?: string | null,"aceptado_por"?: string | null,"cliente_acepto"?: boolean,"cliente_id"?: string | null,"created_at"?: string | null,"estado"?: Database["public"]['Enums']["estado_cotizacion"] | null,"id"?: string,"metodo_aceptacion"?: string | null,"metodo_pago"?: Database["public"]['Enums']["metodo_pago"],"nota_aceptacion"?: string | null,"observaciones"?: string | null,"operation_id"?: string | null,"sucursal_id"?: string | null,"total"?: number,"valida_hasta"?: string | null,"vendedor_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cotizaciones_aceptado_por_fkey"
      columns: ["aceptado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cotizaciones_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cotizaciones_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cotizaciones_vendedor_id_fkey"
      columns: ["vendedor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"cuentas_cobrar": {
                  Row: {
                    "cliente_id": string | null,"created_at": string | null,"estado": Database["public"]['Enums']["estado_cuenta"] | null,"fecha_vencimiento": string,"fecha_venta": string,"id": string,"monto_total": number,"pedido_id": string | null,"saldo_pendiente": number,"venta_id": string | null
                  }
                  Insert: {
                    "cliente_id"?: string | null,"created_at"?: string | null,"estado"?: Database["public"]['Enums']["estado_cuenta"] | null,"fecha_vencimiento": string,"fecha_venta"?: string,"id"?: string,"monto_total": number,"pedido_id"?: string | null,"saldo_pendiente": number,"venta_id"?: string | null
                  }
                  Update: {
                    "cliente_id"?: string | null,"created_at"?: string | null,"estado"?: Database["public"]['Enums']["estado_cuenta"] | null,"fecha_vencimiento"?: string,"fecha_venta"?: string,"id"?: string,"monto_total"?: number,"pedido_id"?: string | null,"saldo_pendiente"?: number,"venta_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cuentas_cobrar_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cuentas_cobrar_pedido_id_fkey"
      columns: ["pedido_id"]
isOneToOne: false
      referencedRelation: "pedidos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cuentas_cobrar_venta_id_fkey"
      columns: ["venta_id"]
isOneToOne: false
      referencedRelation: "ventas"
      referencedColumns: ["id"]
    }
                  ]
                },"defectuosos": {
                  Row: {
                    "cantidad": number,"created_at": string | null,"id": string,"motivo": string,"operation_id": string | null,"producto_id": string | null,"reportado_por": string | null,"sucursal_id": string | null
                  }
                  Insert: {
                    "cantidad": number,"created_at"?: string | null,"id"?: string,"motivo": string,"operation_id"?: string | null,"producto_id"?: string | null,"reportado_por"?: string | null,"sucursal_id"?: string | null
                  }
                  Update: {
                    "cantidad"?: number,"created_at"?: string | null,"id"?: string,"motivo"?: string,"operation_id"?: string | null,"producto_id"?: string | null,"reportado_por"?: string | null,"sucursal_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "defectuosos_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "defectuosos_reportado_por_fkey"
      columns: ["reportado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "defectuosos_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    }
                  ]
                },"devolucion_items": {
                  Row: {
                    "cantidad": number,"devolucion_id": string | null,"id": string,"precio_unitario": number,"producto_id": string | null,"subtotal": number
                  }
                  Insert: {
                    "cantidad": number,"devolucion_id"?: string | null,"id"?: string,"precio_unitario": number,"producto_id"?: string | null,"subtotal": number
                  }
                  Update: {
                    "cantidad"?: number,"devolucion_id"?: string | null,"id"?: string,"precio_unitario"?: number,"producto_id"?: string | null,"subtotal"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "devolucion_items_devolucion_id_fkey"
      columns: ["devolucion_id"]
isOneToOne: false
      referencedRelation: "devoluciones"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "devolucion_items_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    }
                  ]
                },"devoluciones": {
                  Row: {
                    "autorizado_por": string | null,"cliente_id": string,"created_at": string | null,"fecha_operativa": string,"id": string,"monto_total": number,"motivo": string,"operation_id": string | null,"sucursal_id": string,"venta_id": string
                  }
                  Insert: {
                    "autorizado_por"?: string | null,"cliente_id": string,"created_at"?: string | null,"fecha_operativa"?: string,"id"?: string,"monto_total": number,"motivo": string,"operation_id"?: string | null,"sucursal_id": string,"venta_id": string
                  }
                  Update: {
                    "autorizado_por"?: string | null,"cliente_id"?: string,"created_at"?: string | null,"fecha_operativa"?: string,"id"?: string,"monto_total"?: number,"motivo"?: string,"operation_id"?: string | null,"sucursal_id"?: string,"venta_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "devoluciones_autorizado_por_fkey"
      columns: ["autorizado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "devoluciones_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "devoluciones_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "devoluciones_venta_id_fkey"
      columns: ["venta_id"]
isOneToOne: false
      referencedRelation: "ventas"
      referencedColumns: ["id"]
    }
                  ]
                },"diseno_extras": {
                  Row: {
                    "created_at": string,"diseno_id": string,"extra_id": string
                  }
                  Insert: {
                    "created_at"?: string,"diseno_id": string,"extra_id": string
                  }
                  Update: {
                    "created_at"?: string,"diseno_id"?: string,"extra_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "diseno_extras_diseno_id_fkey"
      columns: ["diseno_id"]
isOneToOne: false
      referencedRelation: "disenos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "diseno_extras_extra_id_fkey"
      columns: ["extra_id"]
isOneToOne: false
      referencedRelation: "extras"
      referencedColumns: ["id"]
    }
                  ]
                },"disenos": {
                  Row: {
                    "activo": boolean,"archivo_id": string | null,"archivo_url": string | null,"categoria_id": string | null,"cliente_id": string | null,"created_at": string | null,"descripcion": string | null,"id": string,"nombre": string,"observaciones": string | null,"precio": number,"producto_id": string | null,"sku": string | null
                  }
                  Insert: {
                    "activo"?: boolean,"archivo_id"?: string | null,"archivo_url"?: string | null,"categoria_id"?: string | null,"cliente_id"?: string | null,"created_at"?: string | null,"descripcion"?: string | null,"id"?: string,"nombre": string,"observaciones"?: string | null,"precio"?: number,"producto_id"?: string | null,"sku"?: string | null
                  }
                  Update: {
                    "activo"?: boolean,"archivo_id"?: string | null,"archivo_url"?: string | null,"categoria_id"?: string | null,"cliente_id"?: string | null,"created_at"?: string | null,"descripcion"?: string | null,"id"?: string,"nombre"?: string,"observaciones"?: string | null,"precio"?: number,"producto_id"?: string | null,"sku"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "disenos_archivo_id_fkey"
      columns: ["archivo_id"]
isOneToOne: false
      referencedRelation: "archivos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "disenos_categoria_id_fkey"
      columns: ["categoria_id"]
isOneToOne: false
      referencedRelation: "categorias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "disenos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "disenos_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    }
                  ]
                },"entregas": {
                  Row: {
                    "created_at": string | null,"entregado_at": string | null,"entregado_por": string | null,"id": string,"observaciones": string | null,"operation_id": string | null,"pedido_id": string | null,"recibido_por": string,"venta_id": string | null
                  }
                  Insert: {
                    "created_at"?: string | null,"entregado_at"?: string | null,"entregado_por"?: string | null,"id"?: string,"observaciones"?: string | null,"operation_id"?: string | null,"pedido_id"?: string | null,"recibido_por": string,"venta_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"entregado_at"?: string | null,"entregado_por"?: string | null,"id"?: string,"observaciones"?: string | null,"operation_id"?: string | null,"pedido_id"?: string | null,"recibido_por"?: string,"venta_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "entregas_entregado_por_fkey"
      columns: ["entregado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "entregas_pedido_id_fkey"
      columns: ["pedido_id"]
isOneToOne: false
      referencedRelation: "pedidos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "entregas_venta_id_fkey"
      columns: ["venta_id"]
isOneToOne: false
      referencedRelation: "ventas"
      referencedColumns: ["id"]
    }
                  ]
                },"extras": {
                  Row: {
                    "activo": boolean | null,"created_at": string | null,"id": string,"nombre": string,"precio_adicional": number
                  }
                  Insert: {
                    "activo"?: boolean | null,"created_at"?: string | null,"id"?: string,"nombre": string,"precio_adicional"?: number
                  }
                  Update: {
                    "activo"?: boolean | null,"created_at"?: string | null,"id"?: string,"nombre"?: string,"precio_adicional"?: number
                  }
                  Relationships: [

                  ]
                },"gastos": {
                  Row: {
                    "autorizado_at": string | null,"autorizado_por": string | null,"categoria": string,"comprobante_url": string | null,"created_at": string | null,"descripcion": string,"estado": string,"id": string,"monto": number,"movimiento_caja_id": string | null,"movimiento_reintegro_id": string | null,"observacion": string | null,"operation_id": string | null,"registrado_por": string | null,"sesion_caja_id": string | null,"sucursal_id": string | null
                  }
                  Insert: {
                    "autorizado_at"?: string | null,"autorizado_por"?: string | null,"categoria": string,"comprobante_url"?: string | null,"created_at"?: string | null,"descripcion": string,"estado"?: string,"id"?: string,"monto": number,"movimiento_caja_id"?: string | null,"movimiento_reintegro_id"?: string | null,"observacion"?: string | null,"operation_id"?: string | null,"registrado_por"?: string | null,"sesion_caja_id"?: string | null,"sucursal_id"?: string | null
                  }
                  Update: {
                    "autorizado_at"?: string | null,"autorizado_por"?: string | null,"categoria"?: string,"comprobante_url"?: string | null,"created_at"?: string | null,"descripcion"?: string,"estado"?: string,"id"?: string,"monto"?: number,"movimiento_caja_id"?: string | null,"movimiento_reintegro_id"?: string | null,"observacion"?: string | null,"operation_id"?: string | null,"registrado_por"?: string | null,"sesion_caja_id"?: string | null,"sucursal_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "gastos_autorizado_por_fkey"
      columns: ["autorizado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gastos_movimiento_caja_id_fkey"
      columns: ["movimiento_caja_id"]
isOneToOne: false
      referencedRelation: "movimientos_caja"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gastos_movimiento_reintegro_id_fkey"
      columns: ["movimiento_reintegro_id"]
isOneToOne: false
      referencedRelation: "movimientos_caja"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gastos_registrado_por_fkey"
      columns: ["registrado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gastos_sesion_caja_id_fkey"
      columns: ["sesion_caja_id"]
isOneToOne: false
      referencedRelation: "sesiones_caja"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gastos_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    }
                  ]
                },"inventarios": {
                  Row: {
                    "id": string,"producto_id": string | null,"stock": number,"stock_maximo": number | null,"stock_minimo": number | null,"sucursal_id": string | null
                  }
                  Insert: {
                    "id"?: string,"producto_id"?: string | null,"stock"?: number,"stock_maximo"?: number | null,"stock_minimo"?: number | null,"sucursal_id"?: string | null
                  }
                  Update: {
                    "id"?: string,"producto_id"?: string | null,"stock"?: number,"stock_maximo"?: number | null,"stock_minimo"?: number | null,"sucursal_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventarios_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventarios_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    }
                  ]
                },"lanzamiento_disenos": {
                  Row: {
                    "created_at": string,"diseno_id": string,"lanzamiento_id": string
                  }
                  Insert: {
                    "created_at"?: string,"diseno_id": string,"lanzamiento_id": string
                  }
                  Update: {
                    "created_at"?: string,"diseno_id"?: string,"lanzamiento_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lanzamiento_disenos_diseno_id_fkey"
      columns: ["diseno_id"]
isOneToOne: false
      referencedRelation: "disenos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lanzamiento_disenos_lanzamiento_id_fkey"
      columns: ["lanzamiento_id"]
isOneToOne: false
      referencedRelation: "lanzamientos"
      referencedColumns: ["id"]
    }
                  ]
                },"lanzamiento_extras": {
                  Row: {
                    "created_at": string,"extra_id": string,"lanzamiento_id": string
                  }
                  Insert: {
                    "created_at"?: string,"extra_id": string,"lanzamiento_id": string
                  }
                  Update: {
                    "created_at"?: string,"extra_id"?: string,"lanzamiento_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lanzamiento_extras_extra_id_fkey"
      columns: ["extra_id"]
isOneToOne: false
      referencedRelation: "extras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lanzamiento_extras_lanzamiento_id_fkey"
      columns: ["lanzamiento_id"]
isOneToOne: false
      referencedRelation: "lanzamientos"
      referencedColumns: ["id"]
    }
                  ]
                },"lanzamientos": {
                  Row: {
                    "archivo_id": string | null,"created_at": string,"created_by": string,"descripcion": string | null,"fecha_lanzamiento": string | null,"id": string,"imagen_path": string | null,"nombre": string,"precio": number | null
                  }
                  Insert: {
                    "archivo_id"?: string | null,"created_at"?: string,"created_by": string,"descripcion"?: string | null,"fecha_lanzamiento"?: string | null,"id"?: string,"imagen_path"?: string | null,"nombre": string,"precio"?: number | null
                  }
                  Update: {
                    "archivo_id"?: string | null,"created_at"?: string,"created_by"?: string,"descripcion"?: string | null,"fecha_lanzamiento"?: string | null,"id"?: string,"imagen_path"?: string | null,"nombre"?: string,"precio"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "lanzamientos_archivo_id_fkey"
      columns: ["archivo_id"]
isOneToOne: false
      referencedRelation: "archivos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lanzamientos_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"metas_sucursal": {
                  Row: {
                    "activa": boolean,"creado_por": string,"created_at": string,"id": string,"objetivo_ventas": number,"periodo_fin": string,"periodo_inicio": string,"sucursal_id": string
                  }
                  Insert: {
                    "activa"?: boolean,"creado_por": string,"created_at"?: string,"id"?: string,"objetivo_ventas": number,"periodo_fin": string,"periodo_inicio": string,"sucursal_id": string
                  }
                  Update: {
                    "activa"?: boolean,"creado_por"?: string,"created_at"?: string,"id"?: string,"objetivo_ventas"?: number,"periodo_fin"?: string,"periodo_inicio"?: string,"sucursal_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "metas_sucursal_creado_por_fkey"
      columns: ["creado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "metas_sucursal_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    }
                  ]
                },"metas_vendedor": {
                  Row: {
                    "activa": boolean,"creado_por": string,"created_at": string,"id": string,"meta_sucursal_id": string | null,"objetivo_ventas": number,"periodo_fin": string,"periodo_inicio": string,"vendedor_id": string
                  }
                  Insert: {
                    "activa"?: boolean,"creado_por": string,"created_at"?: string,"id"?: string,"meta_sucursal_id"?: string | null,"objetivo_ventas": number,"periodo_fin": string,"periodo_inicio": string,"vendedor_id": string
                  }
                  Update: {
                    "activa"?: boolean,"creado_por"?: string,"created_at"?: string,"id"?: string,"meta_sucursal_id"?: string | null,"objetivo_ventas"?: number,"periodo_fin"?: string,"periodo_inicio"?: string,"vendedor_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "metas_vendedor_creado_por_fkey"
      columns: ["creado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "metas_vendedor_meta_sucursal_id_fkey"
      columns: ["meta_sucursal_id"]
isOneToOne: false
      referencedRelation: "metas_sucursal"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "metas_vendedor_vendedor_id_fkey"
      columns: ["vendedor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"movimientos_caja": {
                  Row: {
                    "concepto": string,"created_at": string | null,"id": string,"monto": number,"operation_id": string | null,"referencia_id": string | null,"sesion_caja_id": string | null,"tipo": string
                  }
                  Insert: {
                    "concepto": string,"created_at"?: string | null,"id"?: string,"monto": number,"operation_id"?: string | null,"referencia_id"?: string | null,"sesion_caja_id"?: string | null,"tipo": string
                  }
                  Update: {
                    "concepto"?: string,"created_at"?: string | null,"id"?: string,"monto"?: number,"operation_id"?: string | null,"referencia_id"?: string | null,"sesion_caja_id"?: string | null,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "movimientos_caja_sesion_caja_id_fkey"
      columns: ["sesion_caja_id"]
isOneToOne: false
      referencedRelation: "sesiones_caja"
      referencedColumns: ["id"]
    }
                  ]
                },"movimientos_inventario": {
                  Row: {
                    "cantidad": number,"created_at": string | null,"id": string,"motivo": string | null,"producto_id": string | null,"stock_anterior": number,"stock_nuevo": number,"sucursal_id": string | null,"tipo": Database["public"]['Enums']["tipo_movimiento_inv"],"usuario_id": string | null
                  }
                  Insert: {
                    "cantidad": number,"created_at"?: string | null,"id"?: string,"motivo"?: string | null,"producto_id"?: string | null,"stock_anterior": number,"stock_nuevo": number,"sucursal_id"?: string | null,"tipo": Database["public"]['Enums']["tipo_movimiento_inv"],"usuario_id"?: string | null
                  }
                  Update: {
                    "cantidad"?: number,"created_at"?: string | null,"id"?: string,"motivo"?: string | null,"producto_id"?: string | null,"stock_anterior"?: number,"stock_nuevo"?: number,"sucursal_id"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_movimiento_inv"],"usuario_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "movimientos_inventario_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_inventario_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_inventario_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"movimientos_saldo_favor": {
                  Row: {
                    "concepto": string,"created_at": string | null,"id": string,"monto": number,"operation_id": string | null,"referencia_id": string | null,"registrado_por": string | null,"saldo_favor_id": string | null,"tipo": string
                  }
                  Insert: {
                    "concepto": string,"created_at"?: string | null,"id"?: string,"monto": number,"operation_id"?: string | null,"referencia_id"?: string | null,"registrado_por"?: string | null,"saldo_favor_id"?: string | null,"tipo": string
                  }
                  Update: {
                    "concepto"?: string,"created_at"?: string | null,"id"?: string,"monto"?: number,"operation_id"?: string | null,"referencia_id"?: string | null,"registrado_por"?: string | null,"saldo_favor_id"?: string | null,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "movimientos_saldo_favor_registrado_por_fkey"
      columns: ["registrado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_saldo_favor_saldo_favor_id_fkey"
      columns: ["saldo_favor_id"]
isOneToOne: false
      referencedRelation: "saldos_favor"
      referencedColumns: ["id"]
    }
                  ]
                },"pagos": {
                  Row: {
                    "cliente_id": string | null,"created_at": string | null,"forma_pago": Database["public"]['Enums']["metodo_pago"],"id": string,"monto": number,"operation_id": string | null,"referencia": string | null,"venta_id": string | null
                  }
                  Insert: {
                    "cliente_id"?: string | null,"created_at"?: string | null,"forma_pago": Database["public"]['Enums']["metodo_pago"],"id"?: string,"monto": number,"operation_id"?: string | null,"referencia"?: string | null,"venta_id"?: string | null
                  }
                  Update: {
                    "cliente_id"?: string | null,"created_at"?: string | null,"forma_pago"?: Database["public"]['Enums']["metodo_pago"],"id"?: string,"monto"?: number,"operation_id"?: string | null,"referencia"?: string | null,"venta_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "pagos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pagos_venta_id_fkey"
      columns: ["venta_id"]
isOneToOne: false
      referencedRelation: "ventas"
      referencedColumns: ["id"]
    }
                  ]
                },"pagos_credito": {
                  Row: {
                    "created_at": string | null,"cuenta_cobrar_id": string | null,"forma_pago": Database["public"]['Enums']["metodo_pago"],"id": string,"monto": number,"operation_id": string | null,"referencia": string | null,"registrado_por": string | null
                  }
                  Insert: {
                    "created_at"?: string | null,"cuenta_cobrar_id"?: string | null,"forma_pago"?: Database["public"]['Enums']["metodo_pago"],"id"?: string,"monto": number,"operation_id"?: string | null,"referencia"?: string | null,"registrado_por"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"cuenta_cobrar_id"?: string | null,"forma_pago"?: Database["public"]['Enums']["metodo_pago"],"id"?: string,"monto"?: number,"operation_id"?: string | null,"referencia"?: string | null,"registrado_por"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "pagos_credito_cuenta_cobrar_id_fkey"
      columns: ["cuenta_cobrar_id"]
isOneToOne: false
      referencedRelation: "cuentas_cobrar"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pagos_credito_registrado_por_fkey"
      columns: ["registrado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"pedido_item_extras": {
                  Row: {
                    "extra_id": string,"pedido_item_id": string,"precio_adicional": number
                  }
                  Insert: {
                    "extra_id": string,"pedido_item_id": string,"precio_adicional": number
                  }
                  Update: {
                    "extra_id"?: string,"pedido_item_id"?: string,"precio_adicional"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "pedido_item_extras_extra_id_fkey"
      columns: ["extra_id"]
isOneToOne: false
      referencedRelation: "extras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedido_item_extras_pedido_item_id_fkey"
      columns: ["pedido_item_id"]
isOneToOne: false
      referencedRelation: "pedido_items"
      referencedColumns: ["id"]
    }
                  ]
                },"pedido_items": {
                  Row: {
                    "cantidad": number,"descuento": number,"diseno_id": string | null,"extra_id": string | null,"id": string,"observaciones": string | null,"pedido_id": string | null,"precio_unitario": number,"producto_id": string | null,"snapshot_economico": NonNullable<Json>,"subtotal": number,"unidad_venta_snapshot": string
                  }
                  Insert: {
                    "cantidad"?: number,"descuento"?: number,"diseno_id"?: string | null,"extra_id"?: string | null,"id"?: string,"observaciones"?: string | null,"pedido_id"?: string | null,"precio_unitario": number,"producto_id"?: string | null,"snapshot_economico"?: NonNullable<Json>,"subtotal": number,"unidad_venta_snapshot"?: string
                  }
                  Update: {
                    "cantidad"?: number,"descuento"?: number,"diseno_id"?: string | null,"extra_id"?: string | null,"id"?: string,"observaciones"?: string | null,"pedido_id"?: string | null,"precio_unitario"?: number,"producto_id"?: string | null,"snapshot_economico"?: NonNullable<Json>,"subtotal"?: number,"unidad_venta_snapshot"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pedido_items_diseno_id_fkey"
      columns: ["diseno_id"]
isOneToOne: false
      referencedRelation: "disenos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedido_items_extra_id_fkey"
      columns: ["extra_id"]
isOneToOne: false
      referencedRelation: "extras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedido_items_pedido_id_fkey"
      columns: ["pedido_id"]
isOneToOne: false
      referencedRelation: "pedidos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedido_items_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    }
                  ]
                },"pedidos": {
                  Row: {
                    "cliente_id": string | null,"cotizacion_id": string | null,"created_at": string | null,"estado": Database["public"]['Enums']["estado_pedido"] | null,"id": string,"metodo_pago": Database["public"]['Enums']["metodo_pago"],"observaciones": string | null,"saldo_pendiente": number,"sucursal_id": string | null,"total": number,"vendedor_id": string | null
                  }
                  Insert: {
                    "cliente_id"?: string | null,"cotizacion_id"?: string | null,"created_at"?: string | null,"estado"?: Database["public"]['Enums']["estado_pedido"] | null,"id"?: string,"metodo_pago"?: Database["public"]['Enums']["metodo_pago"],"observaciones"?: string | null,"saldo_pendiente"?: number,"sucursal_id"?: string | null,"total"?: number,"vendedor_id"?: string | null
                  }
                  Update: {
                    "cliente_id"?: string | null,"cotizacion_id"?: string | null,"created_at"?: string | null,"estado"?: Database["public"]['Enums']["estado_pedido"] | null,"id"?: string,"metodo_pago"?: Database["public"]['Enums']["metodo_pago"],"observaciones"?: string | null,"saldo_pendiente"?: number,"sucursal_id"?: string | null,"total"?: number,"vendedor_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "pedidos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedidos_cotizacion_id_fkey"
      columns: ["cotizacion_id"]
isOneToOne: false
      referencedRelation: "cotizaciones"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedidos_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedidos_vendedor_id_fkey"
      columns: ["vendedor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"productos": {
                  Row: {
                    "activo": boolean | null,"categoria_id": string | null,"created_at": string | null,"descripcion": string | null,"id": string,"nombre": string,"precio_base": number,"precio_mayorista": number,"sku": string,"unidad_venta": string
                  }
                  Insert: {
                    "activo"?: boolean | null,"categoria_id"?: string | null,"created_at"?: string | null,"descripcion"?: string | null,"id"?: string,"nombre": string,"precio_base"?: number,"precio_mayorista"?: number,"sku": string,"unidad_venta"?: string
                  }
                  Update: {
                    "activo"?: boolean | null,"categoria_id"?: string | null,"created_at"?: string | null,"descripcion"?: string | null,"id"?: string,"nombre"?: string,"precio_base"?: number,"precio_mayorista"?: number,"sku"?: string,"unidad_venta"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "productos_categoria_id_fkey"
      columns: ["categoria_id"]
isOneToOne: false
      referencedRelation: "categorias"
      referencedColumns: ["id"]
    }
                  ]
                },"productos_costos": {
                  Row: {
                    "actualizado_por": string | null,"costo_unitario": number,"producto_id": string,"updated_at": string
                  }
                  Insert: {
                    "actualizado_por"?: string | null,"costo_unitario"?: number,"producto_id": string,"updated_at"?: string
                  }
                  Update: {
                    "actualizado_por"?: string | null,"costo_unitario"?: number,"producto_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "productos_costos_actualizado_por_fkey"
      columns: ["actualizado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "productos_costos_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: true
      referencedRelation: "productos"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "activo": boolean | null,"created_at": string | null,"id": string,"nombre_completo": string,"role": Database["public"]['Enums']["user_role"]
                  }
                  Insert: {
                    "activo"?: boolean | null,"created_at"?: string | null,"id": string,"nombre_completo": string,"role"?: Database["public"]['Enums']["user_role"]
                  }
                  Update: {
                    "activo"?: boolean | null,"created_at"?: string | null,"id"?: string,"nombre_completo"?: string,"role"?: Database["public"]['Enums']["user_role"]
                  }
                  Relationships: [

                  ]
                },"recordatorios": {
                  Row: {
                    "cliente_id": string | null,"created_at": string | null,"cuenta_cobrar_id": string | null,"enviado": boolean | null,"fecha_recordatorio": string,"id": string,"nota": string | null
                  }
                  Insert: {
                    "cliente_id"?: string | null,"created_at"?: string | null,"cuenta_cobrar_id"?: string | null,"enviado"?: boolean | null,"fecha_recordatorio": string,"id"?: string,"nota"?: string | null
                  }
                  Update: {
                    "cliente_id"?: string | null,"created_at"?: string | null,"cuenta_cobrar_id"?: string | null,"enviado"?: boolean | null,"fecha_recordatorio"?: string,"id"?: string,"nota"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "recordatorios_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recordatorios_cuenta_cobrar_id_fkey"
      columns: ["cuenta_cobrar_id"]
isOneToOne: false
      referencedRelation: "cuentas_cobrar"
      referencedColumns: ["id"]
    }
                  ]
                },"reglas_comision": {
                  Row: {
                    "activa": boolean | null,"id": string,"monto_max": number,"monto_min": number,"porcentaje": number,"tipo_cliente": string
                  }
                  Insert: {
                    "activa"?: boolean | null,"id"?: string,"monto_max": number,"monto_min"?: number,"porcentaje": number,"tipo_cliente": string
                  }
                  Update: {
                    "activa"?: boolean | null,"id"?: string,"monto_max"?: number,"monto_min"?: number,"porcentaje"?: number,"tipo_cliente"?: string
                  }
                  Relationships: [

                  ]
                },"reglas_descuento": {
                  Row: {
                    "activa": boolean | null,"created_at": string | null,"id": string,"monto_minimo": number | null,"nombre": string,"porcentaje": number | null
                  }
                  Insert: {
                    "activa"?: boolean | null,"created_at"?: string | null,"id"?: string,"monto_minimo"?: number | null,"nombre": string,"porcentaje"?: number | null
                  }
                  Update: {
                    "activa"?: boolean | null,"created_at"?: string | null,"id"?: string,"monto_minimo"?: number | null,"nombre"?: string,"porcentaje"?: number | null
                  }
                  Relationships: [

                  ]
                },"saldos_favor": {
                  Row: {
                    "cliente_id": string | null,"id": string,"saldo_disponible": number,"updated_at": string | null
                  }
                  Insert: {
                    "cliente_id"?: string | null,"id"?: string,"saldo_disponible"?: number,"updated_at"?: string | null
                  }
                  Update: {
                    "cliente_id"?: string | null,"id"?: string,"saldo_disponible"?: number,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "saldos_favor_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: true
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    }
                  ]
                },"sesiones_caja": {
                  Row: {
                    "cerrado_por": string | null,"conteo_denominaciones": Json | null,"diferencia": number | null,"estado": string | null,"fecha_apertura": string | null,"fecha_cierre": string | null,"id": string,"monto_apertura": number,"monto_cierre": number | null,"monto_esperado": number | null,"sucursal_id": string | null,"usuario_id": string | null
                  }
                  Insert: {
                    "cerrado_por"?: string | null,"conteo_denominaciones"?: Json | null,"diferencia"?: number | null,"estado"?: string | null,"fecha_apertura"?: string | null,"fecha_cierre"?: string | null,"id"?: string,"monto_apertura"?: number,"monto_cierre"?: number | null,"monto_esperado"?: number | null,"sucursal_id"?: string | null,"usuario_id"?: string | null
                  }
                  Update: {
                    "cerrado_por"?: string | null,"conteo_denominaciones"?: Json | null,"diferencia"?: number | null,"estado"?: string | null,"fecha_apertura"?: string | null,"fecha_cierre"?: string | null,"id"?: string,"monto_apertura"?: number,"monto_cierre"?: number | null,"monto_esperado"?: number | null,"sucursal_id"?: string | null,"usuario_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "sesiones_caja_cerrado_por_fkey"
      columns: ["cerrado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sesiones_caja_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sesiones_caja_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"solicitudes_ajuste_inventario": {
                  Row: {
                    "delta": number | null,"estado": string,"id": string,"motivo": string,"operation_id": string | null,"producto_id": string,"revisado_at": string | null,"revisado_por": string | null,"solicitado_at": string,"solicitado_por": string,"stock_anterior": number,"stock_nuevo": number,"sucursal_id": string
                  }
                  Insert: {
                    "delta"?: never,"estado"?: string,"id"?: string,"motivo": string,"operation_id"?: string | null,"producto_id": string,"revisado_at"?: string | null,"revisado_por"?: string | null,"solicitado_at"?: string,"solicitado_por": string,"stock_anterior": number,"stock_nuevo": number,"sucursal_id": string
                  }
                  Update: {
                    "delta"?: never,"estado"?: string,"id"?: string,"motivo"?: string,"operation_id"?: string | null,"producto_id"?: string,"revisado_at"?: string | null,"revisado_por"?: string | null,"solicitado_at"?: string,"solicitado_por"?: string,"stock_anterior"?: number,"stock_nuevo"?: number,"sucursal_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "solicitudes_ajuste_inventario_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solicitudes_ajuste_inventario_revisado_por_fkey"
      columns: ["revisado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solicitudes_ajuste_inventario_solicitado_por_fkey"
      columns: ["solicitado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solicitudes_ajuste_inventario_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    }
                  ]
                },"sucursales": {
                  Row: {
                    "activa": boolean | null,"created_at": string | null,"direccion": string | null,"id": string,"nombre": string,"telefono": string | null
                  }
                  Insert: {
                    "activa"?: boolean | null,"created_at"?: string | null,"direccion"?: string | null,"id"?: string,"nombre": string,"telefono"?: string | null
                  }
                  Update: {
                    "activa"?: boolean | null,"created_at"?: string | null,"direccion"?: string | null,"id"?: string,"nombre"?: string,"telefono"?: string | null
                  }
                  Relationships: [

                  ]
                },"traslado_items": {
                  Row: {
                    "cantidad": number,"id": string,"producto_id": string | null,"traslado_id": string | null
                  }
                  Insert: {
                    "cantidad": number,"id"?: string,"producto_id"?: string | null,"traslado_id"?: string | null
                  }
                  Update: {
                    "cantidad"?: number,"id"?: string,"producto_id"?: string | null,"traslado_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "traslado_items_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "traslado_items_traslado_id_fkey"
      columns: ["traslado_id"]
isOneToOne: false
      referencedRelation: "traslados"
      referencedColumns: ["id"]
    }
                  ]
                },"traslados": {
                  Row: {
                    "created_at": string | null,"estado": Database["public"]['Enums']["estado_traslado"] | null,"id": string,"operation_id": string | null,"recibido_por": string | null,"solicitado_por": string | null,"sucursal_destino_id": string | null,"sucursal_origen_id": string | null,"updated_at": string | null
                  }
                  Insert: {
                    "created_at"?: string | null,"estado"?: Database["public"]['Enums']["estado_traslado"] | null,"id"?: string,"operation_id"?: string | null,"recibido_por"?: string | null,"solicitado_por"?: string | null,"sucursal_destino_id"?: string | null,"sucursal_origen_id"?: string | null,"updated_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"estado"?: Database["public"]['Enums']["estado_traslado"] | null,"id"?: string,"operation_id"?: string | null,"recibido_por"?: string | null,"solicitado_por"?: string | null,"sucursal_destino_id"?: string | null,"sucursal_origen_id"?: string | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "traslados_recibido_por_fkey"
      columns: ["recibido_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "traslados_solicitado_por_fkey"
      columns: ["solicitado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "traslados_sucursal_destino_id_fkey"
      columns: ["sucursal_destino_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "traslados_sucursal_origen_id_fkey"
      columns: ["sucursal_origen_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    }
                  ]
                },"usuario_sucursal": {
                  Row: {
                    "created_at": string | null,"id": string,"sucursal_id": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string | null,"id"?: string,"sucursal_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"sucursal_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "usuario_sucursal_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "usuario_sucursal_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"venta_costos": {
                  Row: {
                    "cantidad": number,"costo_unitario": number,"created_at": string,"producto_id": string,"venta_item_id": string
                  }
                  Insert: {
                    "cantidad": number,"costo_unitario": number,"created_at"?: string,"producto_id": string,"venta_item_id": string
                  }
                  Update: {
                    "cantidad"?: number,"costo_unitario"?: number,"created_at"?: string,"producto_id"?: string,"venta_item_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "venta_costos_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "venta_costos_venta_item_id_fkey"
      columns: ["venta_item_id"]
isOneToOne: true
      referencedRelation: "venta_items"
      referencedColumns: ["id"]
    }
                  ]
                },"venta_items": {
                  Row: {
                    "cantidad": number,"descuento": number,"diseno_id": string | null,"extra_id": string | null,"id": string,"precio_unitario": number,"producto_id": string | null,"snapshot_economico": NonNullable<Json>,"subtotal": number,"unidad_venta_snapshot": string,"venta_id": string | null
                  }
                  Insert: {
                    "cantidad": number,"descuento"?: number,"diseno_id"?: string | null,"extra_id"?: string | null,"id"?: string,"precio_unitario": number,"producto_id"?: string | null,"snapshot_economico"?: NonNullable<Json>,"subtotal": number,"unidad_venta_snapshot"?: string,"venta_id"?: string | null
                  }
                  Update: {
                    "cantidad"?: number,"descuento"?: number,"diseno_id"?: string | null,"extra_id"?: string | null,"id"?: string,"precio_unitario"?: number,"producto_id"?: string | null,"snapshot_economico"?: NonNullable<Json>,"subtotal"?: number,"unidad_venta_snapshot"?: string,"venta_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "venta_items_diseno_id_fkey"
      columns: ["diseno_id"]
isOneToOne: false
      referencedRelation: "disenos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "venta_items_extra_id_fkey"
      columns: ["extra_id"]
isOneToOne: false
      referencedRelation: "extras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "venta_items_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "venta_items_venta_id_fkey"
      columns: ["venta_id"]
isOneToOne: false
      referencedRelation: "ventas"
      referencedColumns: ["id"]
    }
                  ]
                },"ventas": {
                  Row: {
                    "cliente_id": string | null,"created_at": string | null,"entregada": boolean,"entregada_at": string | null,"entregada_por": string | null,"forma_pago": Database["public"]['Enums']["metodo_pago"],"id": string,"operation_id": string | null,"pedido_id": string | null,"sucursal_id": string | null,"total": number,"vendedor_id": string | null
                  }
                  Insert: {
                    "cliente_id"?: string | null,"created_at"?: string | null,"entregada"?: boolean,"entregada_at"?: string | null,"entregada_por"?: string | null,"forma_pago"?: Database["public"]['Enums']["metodo_pago"],"id"?: string,"operation_id"?: string | null,"pedido_id"?: string | null,"sucursal_id"?: string | null,"total": number,"vendedor_id"?: string | null
                  }
                  Update: {
                    "cliente_id"?: string | null,"created_at"?: string | null,"entregada"?: boolean,"entregada_at"?: string | null,"entregada_por"?: string | null,"forma_pago"?: Database["public"]['Enums']["metodo_pago"],"id"?: string,"operation_id"?: string | null,"pedido_id"?: string | null,"sucursal_id"?: string | null,"total"?: number,"vendedor_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ventas_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ventas_entregada_por_fkey"
      columns: ["entregada_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ventas_pedido_id_fkey"
      columns: ["pedido_id"]
isOneToOne: false
      referencedRelation: "pedidos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ventas_sucursal_id_fkey"
      columns: ["sucursal_id"]
isOneToOne: false
      referencedRelation: "sucursales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ventas_vendedor_id_fkey"
      columns: ["vendedor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "abrir_caja":
{ Args: { "p_monto_apertura": number,"p_sucursal_id": string,"p_usuario_id": string }; Returns: string
                           },
"actualizar_estado_pedido":
{ Args: { "p_actualizado_por"?: string,"p_estado": Database["public"]['Enums']["estado_pedido"],"p_pedido_id": string }; Returns: Database["public"]['Enums']["estado_pedido"]
                           },
"altix_can_access_branch":
{ Args: { "p_sucursal_id": string,"p_user_id"?: string }; Returns: boolean
                           },
"altix_crear_aprobacion":
{ Args: { "p_datos_solicitados": Json,"p_motivo": string,"p_operation_id"?: string,"p_referencia_id": string,"p_referencia_tabla": string,"p_solicitante_id": string,"p_sucursal_id": string,"p_tipo": string,"p_valor_solicitado": number }; Returns: string
                           },
"altix_is_active_user":
{ Args: { "p_user_id"?: string }; Returns: boolean
                           },
"altix_is_admin":
{ Args: { "p_user_id"?: string }; Returns: boolean
                           },
"altix_require_actor":
{ Args: { "p_actor_id": string,"p_sucursal_id": string }; Returns: undefined
                           },
"altix_require_admin":
{ Args: { "p_actor_id": string }; Returns: undefined
                           },
"altix_role":
{ Args: { "p_user_id"?: string }; Returns: string
                           },
"aplicar_saldo_favor":
{ Args: { "p_actor_id"?: string,"p_cliente_id": string,"p_concepto": string,"p_monto": number,"p_operation_id"?: string,"p_referencia_id"?: string }; Returns: undefined
                           },
"aprobar_ajuste_inventario":
{ Args: { "p_ajuste_id": string,"p_aprobado_por": string }; Returns: string
                           },
"cerrar_caja":
{ Args: { "p_denominaciones": Json,"p_sesion_caja_id": string }; Returns: Json
                           },
"configurar_costo_producto":
{ Args: { "p_admin_id"?: string,"p_costo_unitario": number,"p_producto_id": string }; Returns: undefined
                           },
"configurar_credito_cliente":
{ Args: { "p_admin_id": string,"p_cliente_id": string,"p_dias_credito": number,"p_monto_autorizado": number }; Returns: undefined
                           },
"configurar_meta_sucursal":
{ Args: { "p_activa"?: boolean,"p_admin_id"?: string,"p_meta_id"?: string,"p_objetivo_ventas"?: number,"p_periodo_fin"?: string,"p_periodo_inicio"?: string,"p_sucursal_id"?: string }; Returns: string
                           },
"configurar_meta_vendedor":
{ Args: { "p_activa"?: boolean,"p_admin_id"?: string,"p_meta_id"?: string,"p_objetivo_ventas"?: number,"p_periodo_fin"?: string,"p_periodo_inicio"?: string,"p_vendedor_id"?: string }; Returns: string
                           },
"configurar_vendedor":
{ Args: { "p_activo"?: boolean,"p_admin_id"?: string,"p_nombre_completo"?: string,"p_sucursal_id"?: string,"p_user_id": string }; Returns: string
                           },
"confirmar_pedido_venta":
{ Args: { "p_confirmado_por"?: string,"p_forma_pago"?: Database["public"]['Enums']["metodo_pago"],"p_monto_recibido"?: number,"p_operation_id"?: string,"p_pedido_id": string,"p_recibido_por"?: string,"p_sesion_caja_id"?: string }; Returns: string
                           },
"convertir_cotizacion_pedido":
{ Args: { "p_cotizacion_id": string }; Returns: string
                           },
"crear_cliente_mayorista":
{ Args: { "p_direccion"?: string,"p_monto_solicitado"?: number,"p_nit_dpi"?: string,"p_nombre": string,"p_solicitado_por"?: string,"p_telefono"?: string }; Returns: string
                           },
"crear_conteo":
{ Args: { "p_realizado_por": string,"p_sucursal_id": string }; Returns: string
                           },
"crear_cotizacion":
{ Args: { "p_aprobacion_id"?: string,"p_cliente_id": string,"p_cotizacion_borrador_id"?: string,"p_items"?: Json,"p_metodo_pago"?: Database["public"]['Enums']["metodo_pago"],"p_motivo_aprobacion"?: string,"p_observaciones"?: string,"p_operation_id"?: string,"p_sucursal_id": string,"p_total": number,"p_valida_hasta"?: string,"p_vendedor_id": string }; Returns: string
                           },
"generar_comision":
{ Args: { "p_venta_id": string }; Returns: string
                           },
"guardar_conteo_batch":
{ Args: { "p_conteo_id": string,"p_finalizar"?: boolean,"p_items": Json }; Returns: undefined
                           },
"guardar_diseno":
{ Args: { "p_activo"?: boolean,"p_archivo_id"?: string,"p_archivo_url"?: string,"p_categoria_id"?: string,"p_cliente_id"?: string,"p_descripcion"?: string,"p_diseno_id"?: string,"p_extra_ids"?: Json,"p_nombre"?: string,"p_observaciones"?: string,"p_precio"?: number,"p_producto_id"?: string,"p_sku"?: string }; Returns: string
                           },
"guardar_lanzamiento":
{ Args: { "p_archivo_id"?: string,"p_descripcion"?: string,"p_diseno_ids"?: Json,"p_extra_ids"?: Json,"p_fecha_lanzamiento"?: string,"p_imagen_path"?: string,"p_lanzamiento_id"?: string,"p_nombre"?: string,"p_precio"?: number }; Returns: string
                           },
"guardar_producto":
{ Args: { "p_activo"?: boolean,"p_admin_id"?: string,"p_categoria_id"?: string,"p_costo_unitario"?: number,"p_descripcion"?: string,"p_nombre"?: string,"p_precio_base"?: number,"p_precio_mayorista"?: number,"p_producto_id"?: string,"p_sku"?: string,"p_unidad_venta"?: string }; Returns: string
                           },
"guardar_sucursal":
{ Args: { "p_activa"?: boolean,"p_admin_id"?: string,"p_nombre"?: string,"p_sucursal_id"?: string }; Returns: string
                           },
"marcar_aprobaciones_vistas":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"marcar_entrega":
{ Args: { "p_observaciones"?: string,"p_pedido_id": string,"p_recibido_por": string }; Returns: string
                           },
"marcar_pedido_entregado":
{ Args: { "p_entregado_por"?: string,"p_observaciones"?: string,"p_operation_id"?: string,"p_pedido_id": string,"p_recibido_por": string }; Returns: string
                           },
"marcar_venta_entregada":
{ Args: { "p_entregada_por": string,"p_venta_id": string }; Returns: string
                           },
"obtener_dashboard_admin":
{ Args: { "p_desde"?: string,"p_hasta"?: string,"p_sucursal_id"?: string }; Returns: Json
                           },
"obtener_dashboard_vendedor":
{ Args: { "p_vendedor_id"?: string }; Returns: Json
                           },
"obtener_reporte_inventario_mensual":
{ Args: { "p_mes": string,"p_sucursal_id"?: string }; Returns: Json
                           },
"obtener_reporte_ventas":
{ Args: { "p_desde": string,"p_hasta": string,"p_sucursal_id"?: string,"p_vendedor_id"?: string }; Returns: Json
                           },
"reasignar_cartera":
{ Args: { "p_autorizado_por": string,"p_vendedor_destino_id": string,"p_vendedor_origen_id": string }; Returns: undefined
                           },
"rechazar_ajuste_inventario":
{ Args: { "p_ajuste_id": string,"p_rechazado_por": string }; Returns: string
                           },
"registrar_aceptacion_cotizacion":
{ Args: { "p_cotizacion_id": string,"p_metodo_aceptacion"?: string,"p_nota_aceptacion"?: string,"p_operation_id"?: string,"p_registrado_por"?: string }; Returns: string
                           },
"registrar_anticipo":
{ Args: { "p_cliente_id": string,"p_comprobante_ref": string,"p_forma_pago": Database["public"]['Enums']["metodo_pago"],"p_monto": number,"p_pedido_id": string }; Returns: string
                           },
"registrar_anticipo_v1":
{ Args: { "p_cliente_id": string,"p_comprobante_ref"?: string,"p_forma_pago": Database["public"]['Enums']["metodo_pago"],"p_monto": number,"p_operation_id"?: string,"p_pedido_id": string,"p_registrado_por"?: string,"p_sesion_caja_id"?: string }; Returns: string
                           },
"registrar_archivo":
{ Args: { "p_bucket"?: string,"p_mime_type": string,"p_nombre_original": string,"p_path": string,"p_size_bytes": number }; Returns: string
                           },
"registrar_defectuoso":
{ Args: { "p_cantidad": number,"p_motivo": string,"p_operation_id"?: string,"p_producto_id": string,"p_reportado_por": string,"p_sucursal_id": string }; Returns: string
                           },
"registrar_devolucion":
{ Args: { "p_autorizado_por": string,"p_fecha_operativa"?: string,"p_items": Json,"p_motivo": string,"p_operation_id"?: string,"p_venta_id": string }; Returns: string
                           },
"registrar_entrada_inventario":
{ Args: { "p_cantidad": number,"p_motivo": string,"p_producto_id": string,"p_sucursal_id": string,"p_usuario_id": string }; Returns: undefined
                           },
"registrar_gasto":
{ Args: { "p_categoria": string,"p_comprobante_url": string,"p_descripcion": string,"p_monto": number,"p_observacion"?: string,"p_operation_id"?: string,"p_registrado_por": string,"p_sesion_caja_id": string,"p_sucursal_id": string }; Returns: string
                           },
"registrar_movimiento_caja":
{ Args: { "p_autorizado_por": string,"p_concepto": string,"p_monto": number,"p_operation_id"?: string,"p_sesion_caja_id": string,"p_tipo": string }; Returns: string
                           },
"registrar_pago":
{ Args: { "p_cuenta_cobrar_id": string,"p_forma_pago": Database["public"]['Enums']["metodo_pago"],"p_monto": number,"p_operation_id"?: string,"p_referencia": string,"p_registrado_por": string,"p_sesion_caja_id"?: string }; Returns: string
                           },
"registrar_pedido_venta":
{ Args: { "p_operation_id"?: string,"p_pedido_id": string,"p_registrado_por"?: string }; Returns: string
                           },
"registrar_venta":
{ Args: { "p_cliente_id": string,"p_items"?: Json,"p_operation_id"?: string,"p_pedido_id"?: string,"p_sesion_caja_id"?: string,"p_sucursal_id": string,"p_tipo_pago"?: string,"p_total"?: number,"p_vendedor_id": string }; Returns: string
                           },
"resolver_aprobacion":
{ Args: { "p_aprobacion_id": string,"p_aprobar": boolean,"p_nota_resolucion"?: string,"p_revisado_por": string }; Returns: string
                           },
"resolver_gasto":
{ Args: { "p_aprobador_id": string,"p_aprobar": boolean,"p_gasto_id": string }; Returns: string
                           },
"revisar_vencimientos_credito":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"show_limit":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"show_trgm":
{ Args: { "": string }; Returns: (string)[]
                           },
"solicitar_ajuste_inventario":
{ Args: { "p_motivo": string,"p_operation_id"?: string,"p_producto_id": string,"p_solicitado_por": string,"p_stock_nuevo": number,"p_sucursal_id": string }; Returns: string
                           },
"solicitar_aprobacion":
{ Args: { "p_datos_solicitados"?: Json,"p_motivo"?: string,"p_operation_id"?: string,"p_referencia_id"?: string,"p_referencia_tabla"?: string,"p_solicitante_id": string,"p_sucursal_id": string,"p_tipo": string,"p_valor_solicitado"?: number }; Returns: string
                           },
"solicitar_credito_cliente":
{ Args: { "p_cliente_id": string,"p_monto_solicitado": number,"p_solicitado_por": string }; Returns: undefined
                           },
"trasladar_inventario":
{ Args: { "p_cantidad": number,"p_operation_id"?: string,"p_producto_id": string,"p_solicitado_por": string,"p_sucursal_destino_id": string,"p_sucursal_origen_id": string }; Returns: string
                           }
          }
          Enums: {
            "estado_cotizacion": "borrador"|"enviada"|"convertida"|"cancelada","estado_cuenta": "pendiente"|"parcial"|"pagada"|"vencida","estado_pedido": "pendiente"|"en_produccion"|"listo"|"entregado"|"cancelado","estado_traslado": "pendiente"|"en_transito"|"recibido"|"cancelado","metodo_pago": "efectivo"|"tarjeta"|"transferencia"|"credito"|"saldo_favor","tipo_movimiento_inv": "entrada"|"salida"|"traslado_salida"|"traslado_entrada"|"ajuste"|"defectuoso"|"devolucion","user_role": "administrador"|"vendedor"|"cajero"|"bodeguero"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "estado_cotizacion": ["borrador", "enviada", "convertida", "cancelada"],"estado_cuenta": ["pendiente", "parcial", "pagada", "vencida"],"estado_pedido": ["pendiente", "en_produccion", "listo", "entregado", "cancelado"],"estado_traslado": ["pendiente", "en_transito", "recibido", "cancelado"],"metodo_pago": ["efectivo", "tarjeta", "transferencia", "credito", "saldo_favor"],"tipo_movimiento_inv": ["entrada", "salida", "traslado_salida", "traslado_entrada", "ajuste", "defectuoso", "devolucion"],"user_role": ["administrador", "vendedor", "cajero", "bodeguero"]
          }
        }
} as const
