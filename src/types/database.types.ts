
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "ajustes_comision": {
                  Row: {
                    "aprobado_por": string | null,"comision_id": string | null,"created_at": string | null,"id": string,"monto_ajuste": number,"motivo": string
                  }
                  Insert: {
                    "aprobado_por"?: string | null,"comision_id"?: string | null,"created_at"?: string | null,"id"?: string,"monto_ajuste": number,"motivo": string
                  }
                  Update: {
                    "aprobado_por"?: string | null,"comision_id"?: string | null,"created_at"?: string | null,"id"?: string,"monto_ajuste"?: number,"motivo"?: string
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
                    "cliente_id": string | null,"comprobante_ref": string | null,"created_at": string | null,"forma_pago": Database["public"]['Enums']["metodo_pago"],"id": string,"monto": number,"pedido_id": string | null
                  }
                  Insert: {
                    "cliente_id"?: string | null,"comprobante_ref"?: string | null,"created_at"?: string | null,"forma_pago"?: Database["public"]['Enums']["metodo_pago"],"id"?: string,"monto": number,"pedido_id"?: string | null
                  }
                  Update: {
                    "cliente_id"?: string | null,"comprobante_ref"?: string | null,"created_at"?: string | null,"forma_pago"?: Database["public"]['Enums']["metodo_pago"],"id"?: string,"monto"?: number,"pedido_id"?: string | null
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
                    "activo": boolean | null,"created_at": string | null,"direccion": string | null,"es_mayorista": boolean | null,"id": string,"nit_dpi": string | null,"nombre": string,"telefono": string | null
                  }
                  Insert: {
                    "activo"?: boolean | null,"created_at"?: string | null,"direccion"?: string | null,"es_mayorista"?: boolean | null,"id"?: string,"nit_dpi"?: string | null,"nombre": string,"telefono"?: string | null
                  }
                  Update: {
                    "activo"?: boolean | null,"created_at"?: string | null,"direccion"?: string | null,"es_mayorista"?: boolean | null,"id"?: string,"nit_dpi"?: string | null,"nombre"?: string,"telefono"?: string | null
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
                },"cotizacion_items": {
                  Row: {
                    "cantidad": number,"cotizacion_id": string | null,"id": string,"observaciones": string | null,"precio_unitario": number,"producto_id": string | null,"subtotal": number
                  }
                  Insert: {
                    "cantidad"?: number,"cotizacion_id"?: string | null,"id"?: string,"observaciones"?: string | null,"precio_unitario": number,"producto_id"?: string | null,"subtotal": number
                  }
                  Update: {
                    "cantidad"?: number,"cotizacion_id"?: string | null,"id"?: string,"observaciones"?: string | null,"precio_unitario"?: number,"producto_id"?: string | null,"subtotal"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "cotizacion_items_cotizacion_id_fkey"
      columns: ["cotizacion_id"]
isOneToOne: false
      referencedRelation: "cotizaciones"
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
                    "cliente_id": string | null,"created_at": string | null,"estado": Database["public"]['Enums']["estado_cotizacion"] | null,"id": string,"observaciones": string | null,"sucursal_id": string | null,"total": number,"valida_hasta": string | null,"vendedor_id": string | null
                  }
                  Insert: {
                    "cliente_id"?: string | null,"created_at"?: string | null,"estado"?: Database["public"]['Enums']["estado_cotizacion"] | null,"id"?: string,"observaciones"?: string | null,"sucursal_id"?: string | null,"total"?: number,"valida_hasta"?: string | null,"vendedor_id"?: string | null
                  }
                  Update: {
                    "cliente_id"?: string | null,"created_at"?: string | null,"estado"?: Database["public"]['Enums']["estado_cotizacion"] | null,"id"?: string,"observaciones"?: string | null,"sucursal_id"?: string | null,"total"?: number,"valida_hasta"?: string | null,"vendedor_id"?: string | null
                  }
                  Relationships: [
                    {
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
                    "cliente_id": string | null,"created_at": string | null,"estado": Database["public"]['Enums']["estado_cuenta"] | null,"fecha_vencimiento": string,"id": string,"monto_total": number,"saldo_pendiente": number,"venta_id": string | null
                  }
                  Insert: {
                    "cliente_id"?: string | null,"created_at"?: string | null,"estado"?: Database["public"]['Enums']["estado_cuenta"] | null,"fecha_vencimiento": string,"id"?: string,"monto_total": number,"saldo_pendiente": number,"venta_id"?: string | null
                  }
                  Update: {
                    "cliente_id"?: string | null,"created_at"?: string | null,"estado"?: Database["public"]['Enums']["estado_cuenta"] | null,"fecha_vencimiento"?: string,"id"?: string,"monto_total"?: number,"saldo_pendiente"?: number,"venta_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cuentas_cobrar_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
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
                    "cantidad": number,"created_at": string | null,"id": string,"motivo": string,"producto_id": string | null,"reportado_por": string | null,"sucursal_id": string | null
                  }
                  Insert: {
                    "cantidad": number,"created_at"?: string | null,"id"?: string,"motivo": string,"producto_id"?: string | null,"reportado_por"?: string | null,"sucursal_id"?: string | null
                  }
                  Update: {
                    "cantidad"?: number,"created_at"?: string | null,"id"?: string,"motivo"?: string,"producto_id"?: string | null,"reportado_por"?: string | null,"sucursal_id"?: string | null
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
                },"disenos": {
                  Row: {
                    "archivo_url": string | null,"cliente_id": string | null,"created_at": string | null,"id": string,"nombre": string,"observaciones": string | null
                  }
                  Insert: {
                    "archivo_url"?: string | null,"cliente_id"?: string | null,"created_at"?: string | null,"id"?: string,"nombre": string,"observaciones"?: string | null
                  }
                  Update: {
                    "archivo_url"?: string | null,"cliente_id"?: string | null,"created_at"?: string | null,"id"?: string,"nombre"?: string,"observaciones"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "disenos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    }
                  ]
                },"entregas": {
                  Row: {
                    "created_at": string | null,"id": string,"observaciones": string | null,"pedido_id": string | null,"recibido_por": string,"venta_id": string | null
                  }
                  Insert: {
                    "created_at"?: string | null,"id"?: string,"observaciones"?: string | null,"pedido_id"?: string | null,"recibido_por": string,"venta_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"observaciones"?: string | null,"pedido_id"?: string | null,"recibido_por"?: string,"venta_id"?: string | null
                  }
                  Relationships: [
                    {
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
                    "categoria": string,"comprobante_url": string | null,"created_at": string | null,"descripcion": string,"id": string,"monto": number,"registrado_por": string | null,"sesion_caja_id": string | null,"sucursal_id": string | null
                  }
                  Insert: {
                    "categoria": string,"comprobante_url"?: string | null,"created_at"?: string | null,"descripcion": string,"id"?: string,"monto": number,"registrado_por"?: string | null,"sesion_caja_id"?: string | null,"sucursal_id"?: string | null
                  }
                  Update: {
                    "categoria"?: string,"comprobante_url"?: string | null,"created_at"?: string | null,"descripcion"?: string,"id"?: string,"monto"?: number,"registrado_por"?: string | null,"sesion_caja_id"?: string | null,"sucursal_id"?: string | null
                  }
                  Relationships: [
                    {
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
                },"movimientos_caja": {
                  Row: {
                    "concepto": string,"created_at": string | null,"id": string,"monto": number,"referencia_id": string | null,"sesion_caja_id": string | null,"tipo": string
                  }
                  Insert: {
                    "concepto": string,"created_at"?: string | null,"id"?: string,"monto": number,"referencia_id"?: string | null,"sesion_caja_id"?: string | null,"tipo": string
                  }
                  Update: {
                    "concepto"?: string,"created_at"?: string | null,"id"?: string,"monto"?: number,"referencia_id"?: string | null,"sesion_caja_id"?: string | null,"tipo"?: string
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
                    "concepto": string,"created_at": string | null,"id": string,"monto": number,"referencia_id": string | null,"saldo_favor_id": string | null,"tipo": string
                  }
                  Insert: {
                    "concepto": string,"created_at"?: string | null,"id"?: string,"monto": number,"referencia_id"?: string | null,"saldo_favor_id"?: string | null,"tipo": string
                  }
                  Update: {
                    "concepto"?: string,"created_at"?: string | null,"id"?: string,"monto"?: number,"referencia_id"?: string | null,"saldo_favor_id"?: string | null,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "movimientos_saldo_favor_saldo_favor_id_fkey"
      columns: ["saldo_favor_id"]
isOneToOne: false
      referencedRelation: "saldos_favor"
      referencedColumns: ["id"]
    }
                  ]
                },"pagos": {
                  Row: {
                    "cliente_id": string | null,"created_at": string | null,"forma_pago": Database["public"]['Enums']["metodo_pago"],"id": string,"monto": number,"referencia": string | null,"venta_id": string | null
                  }
                  Insert: {
                    "cliente_id"?: string | null,"created_at"?: string | null,"forma_pago": Database["public"]['Enums']["metodo_pago"],"id"?: string,"monto": number,"referencia"?: string | null,"venta_id"?: string | null
                  }
                  Update: {
                    "cliente_id"?: string | null,"created_at"?: string | null,"forma_pago"?: Database["public"]['Enums']["metodo_pago"],"id"?: string,"monto"?: number,"referencia"?: string | null,"venta_id"?: string | null
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
                    "created_at": string | null,"cuenta_cobrar_id": string | null,"forma_pago": Database["public"]['Enums']["metodo_pago"],"id": string,"monto": number,"referencia": string | null,"registrado_por": string | null
                  }
                  Insert: {
                    "created_at"?: string | null,"cuenta_cobrar_id"?: string | null,"forma_pago"?: Database["public"]['Enums']["metodo_pago"],"id"?: string,"monto": number,"referencia"?: string | null,"registrado_por"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"cuenta_cobrar_id"?: string | null,"forma_pago"?: Database["public"]['Enums']["metodo_pago"],"id"?: string,"monto"?: number,"referencia"?: string | null,"registrado_por"?: string | null
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
                },"pedido_items": {
                  Row: {
                    "cantidad": number,"diseno_id": string | null,"id": string,"observaciones": string | null,"pedido_id": string | null,"precio_unitario": number,"producto_id": string | null,"subtotal": number
                  }
                  Insert: {
                    "cantidad"?: number,"diseno_id"?: string | null,"id"?: string,"observaciones"?: string | null,"pedido_id"?: string | null,"precio_unitario": number,"producto_id"?: string | null,"subtotal": number
                  }
                  Update: {
                    "cantidad"?: number,"diseno_id"?: string | null,"id"?: string,"observaciones"?: string | null,"pedido_id"?: string | null,"precio_unitario"?: number,"producto_id"?: string | null,"subtotal"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "pedido_items_diseno_id_fkey"
      columns: ["diseno_id"]
isOneToOne: false
      referencedRelation: "disenos"
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
                    "cliente_id": string | null,"cotizacion_id": string | null,"created_at": string | null,"estado": Database["public"]['Enums']["estado_pedido"] | null,"id": string,"observaciones": string | null,"saldo_pendiente": number,"sucursal_id": string | null,"total": number,"vendedor_id": string | null
                  }
                  Insert: {
                    "cliente_id"?: string | null,"cotizacion_id"?: string | null,"created_at"?: string | null,"estado"?: Database["public"]['Enums']["estado_pedido"] | null,"id"?: string,"observaciones"?: string | null,"saldo_pendiente"?: number,"sucursal_id"?: string | null,"total"?: number,"vendedor_id"?: string | null
                  }
                  Update: {
                    "cliente_id"?: string | null,"cotizacion_id"?: string | null,"created_at"?: string | null,"estado"?: Database["public"]['Enums']["estado_pedido"] | null,"id"?: string,"observaciones"?: string | null,"saldo_pendiente"?: number,"sucursal_id"?: string | null,"total"?: number,"vendedor_id"?: string | null
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
                    "activo": boolean | null,"categoria_id": string | null,"created_at": string | null,"descripcion": string | null,"id": string,"nombre": string,"precio_base": number,"precio_mayorista": number,"sku": string
                  }
                  Insert: {
                    "activo"?: boolean | null,"categoria_id"?: string | null,"created_at"?: string | null,"descripcion"?: string | null,"id"?: string,"nombre": string,"precio_base"?: number,"precio_mayorista"?: number,"sku": string
                  }
                  Update: {
                    "activo"?: boolean | null,"categoria_id"?: string | null,"created_at"?: string | null,"descripcion"?: string | null,"id"?: string,"nombre"?: string,"precio_base"?: number,"precio_mayorista"?: number,"sku"?: string
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
                    "estado": string | null,"fecha_apertura": string | null,"fecha_cierre": string | null,"id": string,"monto_apertura": number,"monto_cierre": number | null,"sucursal_id": string | null,"usuario_id": string | null
                  }
                  Insert: {
                    "estado"?: string | null,"fecha_apertura"?: string | null,"fecha_cierre"?: string | null,"id"?: string,"monto_apertura"?: number,"monto_cierre"?: number | null,"sucursal_id"?: string | null,"usuario_id"?: string | null
                  }
                  Update: {
                    "estado"?: string | null,"fecha_apertura"?: string | null,"fecha_cierre"?: string | null,"id"?: string,"monto_apertura"?: number,"monto_cierre"?: number | null,"sucursal_id"?: string | null,"usuario_id"?: string | null
                  }
                  Relationships: [
                    {
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
                    "created_at": string | null,"estado": Database["public"]['Enums']["estado_traslado"] | null,"id": string,"recibido_por": string | null,"solicitado_por": string | null,"sucursal_destino_id": string | null,"sucursal_origen_id": string | null,"updated_at": string | null
                  }
                  Insert: {
                    "created_at"?: string | null,"estado"?: Database["public"]['Enums']["estado_traslado"] | null,"id"?: string,"recibido_por"?: string | null,"solicitado_por"?: string | null,"sucursal_destino_id"?: string | null,"sucursal_origen_id"?: string | null,"updated_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"estado"?: Database["public"]['Enums']["estado_traslado"] | null,"id"?: string,"recibido_por"?: string | null,"solicitado_por"?: string | null,"sucursal_destino_id"?: string | null,"sucursal_origen_id"?: string | null,"updated_at"?: string | null
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
                },"venta_items": {
                  Row: {
                    "cantidad": number,"id": string,"precio_unitario": number,"producto_id": string | null,"subtotal": number,"venta_id": string | null
                  }
                  Insert: {
                    "cantidad": number,"id"?: string,"precio_unitario": number,"producto_id"?: string | null,"subtotal": number,"venta_id"?: string | null
                  }
                  Update: {
                    "cantidad"?: number,"id"?: string,"precio_unitario"?: number,"producto_id"?: string | null,"subtotal"?: number,"venta_id"?: string | null
                  }
                  Relationships: [
                    {
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
                    "cliente_id": string | null,"created_at": string | null,"id": string,"pedido_id": string | null,"sucursal_id": string | null,"total": number,"vendedor_id": string | null
                  }
                  Insert: {
                    "cliente_id"?: string | null,"created_at"?: string | null,"id"?: string,"pedido_id"?: string | null,"sucursal_id"?: string | null,"total": number,"vendedor_id"?: string | null
                  }
                  Update: {
                    "cliente_id"?: string | null,"created_at"?: string | null,"id"?: string,"pedido_id"?: string | null,"sucursal_id"?: string | null,"total"?: number,"vendedor_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ventas_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
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
"cerrar_caja":
{ Args: { "p_monto_cierre": number,"p_sesion_caja_id": string }; Returns: undefined
                           },
"convertir_cotizacion_pedido":
{ Args: { "p_cotizacion_id": string }; Returns: string
                           },
"generar_comision":
{ Args: { "p_venta_id": string }; Returns: string
                           },
"registrar_anticipo":
{ Args: { "p_cliente_id": string,"p_comprobante_ref": string,"p_forma_pago": Database["public"]['Enums']["metodo_pago"],"p_monto": number,"p_pedido_id": string }; Returns: string
                           },
"registrar_gasto":
{ Args: { "p_categoria": string,"p_comprobante_url": string,"p_descripcion": string,"p_monto": number,"p_registrado_por": string,"p_sesion_caja_id": string,"p_sucursal_id": string }; Returns: string
                           },
"registrar_venta":
{ Args: { "p_cliente_id": string,"p_items": Json,"p_pedido_id"?: string,"p_sesion_caja_id": string,"p_sucursal_id": string,"p_tipo_pago": string,"p_total": number,"p_vendedor_id": string }; Returns: string
                           },
"show_limit":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"show_trgm":
{ Args: { "": string }; Returns: (string)[]
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
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "estado_cotizacion": ["borrador", "enviada", "convertida", "cancelada"],"estado_cuenta": ["pendiente", "parcial", "pagada", "vencida"],"estado_pedido": ["pendiente", "en_produccion", "listo", "entregado", "cancelado"],"estado_traslado": ["pendiente", "en_transito", "recibido", "cancelado"],"metodo_pago": ["efectivo", "tarjeta", "transferencia", "credito", "saldo_favor"],"tipo_movimiento_inv": ["entrada", "salida", "traslado_salida", "traslado_entrada", "ajuste", "defectuoso", "devolucion"],"user_role": ["administrador", "vendedor", "cajero", "bodeguero"]
          }
        }
} as const

