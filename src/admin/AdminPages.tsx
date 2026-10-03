/* eslint-disable react/set-state-in-effect */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CircleAlert, Download, RefreshCw, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../shared/lib/supabase";
import { AdminDesignsPage, AdminExtrasPage } from "./AdminCatalogForms";
import { AdminActionButton, type AdminAction } from "./AdminActionForms";
import { friendlyAdminError } from "./admin.errors";
import { adminService } from "./admin.service";
import { useAuth } from "../auth/hooks/useAuth";
import { AdminProfitDashboardPage, AdminReportsPage } from "./AdminAnalyticsPages";
import { PrintDocumentButton } from "../shared/printing/PrintDocumentButton";

type AdminRow = Record<string, unknown>;
type Branch = { id: string; nombre: string };
type Resource =
  | "ventas"
  | "cotizaciones"
  | "pedidos"
  | "clientes"
  | "productos"
  | "inventarios"
  | "sesiones_caja"
  | "movimientos_caja"
  | "gastos"
  | "cuentas_cobrar"
  | "comisiones"
  | "bitacora_auditoria"
  | "profiles"
  | "sucursales"
  | "disenos"
  | "extras"
  | "archivos"
  | "traslados"
  | "conteos"
  | "ajustes"
  | "movimientos_inventario"
  | "defectuosos";

const isRecord = (value: unknown): value is AdminRow => typeof value === "object" && value !== null;
const rows = (value: unknown): AdminRow[] => (Array.isArray(value) ? value.filter(isRecord) : []);
const money = (value: unknown) =>
  typeof value === "number"
    ? `Q ${value.toLocaleString("es-GT", { minimumFractionDigits: 2 })}`
    : "—";
const date = (value: unknown) =>
  typeof value === "string" ? new Date(value).toLocaleDateString("es-GT") : "—";

const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const downloadCsv = (filename: string, columns: string[], data: Array<Record<string, unknown>>) => {
  const csv = [
    columns.join(","),
    ...data.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  anchor.remove();
};

const AdminExportButton: React.FC<{
  onDone: (message: string) => void;
  onError: (message: string) => void;
  inventoryRows?: AdminRow[];
}> = ({ onDone, onError, inventoryRows }) => {
  const [loading, setLoading] = useState(false);
  const exportInventory = async () => {
    setLoading(true);
    try {
      if (inventoryRows) {
        const data = inventoryRows.map((row) => {
          const product = isRecord(row.productos) ? row.productos : {};
          const category = isRecord(product.categorias) ? product.categorias : {};
          const cost = isRecord(product.productos_costos) ? product.productos_costos : {};
          const branch = isRecord(row.sucursales) ? row.sucursales : {};
          return {
            Sucursal: branch.nombre ?? "",
            SKU: product.sku ?? "",
            Producto: product.nombre ?? "",
            Categoría: category.nombre ?? "",
            Stock: row.stock,
            Activo: product.activo ?? "",
            Precio: product.precio_base ?? "",
            Costo: cost.costo_unitario ?? "",
          };
        });
        downloadCsv(`inventario_${new Date().toISOString().slice(0, 10)}.csv`, ["Sucursal", "SKU", "Producto", "Categoría", "Stock", "Activo", "Precio", "Costo"], data);
        onDone("Archivo de inventario generado correctamente.");
        return;
      }
      const [inventory, movements, sales, transfers, transferItems, adjustments, defectives] =
        await Promise.all([
          supabase
            .from("inventarios")
            .select("stock,sucursal_id,producto_id,productos(nombre,sku),sucursales(nombre)"),
          supabase
            .from("movimientos_inventario")
            .select(
              "created_at,sucursal_id,producto_id,tipo,cantidad,stock_nuevo,motivo,profiles(nombre_completo),productos(nombre,sku),sucursales(nombre)",
            ),
          supabase
            .from("ventas")
            .select(
              "created_at,sucursal_id,total,vendedor_id,profiles(nombre_completo),sucursales(nombre)",
            ),
          supabase
            .from("traslados")
            .select(
              "id,created_at,sucursal_origen_id,sucursal_destino_id,solicitado_por,profiles(nombre_completo)",
            ),
          supabase
            .from("traslado_items")
            .select("traslado_id,producto_id,cantidad,productos(nombre,sku)"),
          supabase
            .from("solicitudes_ajuste_inventario")
            .select(
              "solicitado_at,sucursal_id,producto_id,stock_nuevo,delta,motivo,solicitado_por,profiles(nombre_completo),productos(nombre,sku),sucursales(nombre)",
            ),
          supabase
            .from("defectuosos")
            .select(
              "created_at,sucursal_id,producto_id,cantidad,motivo,reportado_por,profiles(nombre_completo),productos(nombre,sku),sucursales(nombre)",
            ),
        ]);
      const failed = [
        inventory,
        movements,
        sales,
        transfers,
        transferItems,
        adjustments,
        defectives,
      ].find((result) => result.error);
      if (failed?.error) throw failed.error;
      const branchName = (row: AdminRow) =>
        isRecord(row.sucursales) ? row.sucursales.nombre : row.sucursal_id;
      const productName = (row: AdminRow) =>
        isRecord(row.productos) ? row.productos.nombre : row.producto_id;
      const productCode = (row: AdminRow) => (isRecord(row.productos) ? row.productos.sku : "");
      const responsible = (row: AdminRow, key: string) =>
        isRecord(row.profiles) ? row.profiles.nombre_completo : row[key];
      const data: Array<Record<string, unknown>> = [
        ...rows(inventory.data).map((row) => ({
          tipo: "stock",
          fecha: new Date().toISOString(),
          sucursal: branchName(row),
          producto: productName(row),
          codigo: productCode(row),
          stock: row.stock,
          historial: "existencia actual",
        })),
        ...rows(movements.data).map((row) => ({
          tipo: "movimiento",
          fecha: row.created_at,
          sucursal: branchName(row),
          producto: productName(row),
          codigo: productCode(row),
          stock: row.stock_nuevo,
          cantidad: row.cantidad,
          movimiento: row.tipo,
          responsable: responsible(row, "usuario_id"),
          motivo: row.motivo,
          historial: "kardex",
        })),
        ...rows(sales.data).map((row) => ({
          tipo: "venta",
          fecha: row.created_at,
          sucursal: branchName(row),
          total: row.total,
          responsable: responsible(row, "vendedor_id"),
          historial: "venta registrada",
        })),
        ...rows(transfers.data).map((row) => ({
          tipo: "traslado",
          fecha: row.created_at,
          sucursal: `${row.sucursal_origen_id} -> ${row.sucursal_destino_id}`,
          responsable: responsible(row, "solicitado_por"),
          historial: "traslado atómico",
        })),
        ...rows(transferItems.data).map((row) => ({
          tipo: "traslado_item",
          producto: productName(row),
          codigo: productCode(row),
          cantidad: row.cantidad,
          historial: row.traslado_id,
        })),
        ...rows(adjustments.data).map((row) => ({
          tipo: "ajuste",
          fecha: row.solicitado_at,
          sucursal: branchName(row),
          producto: productName(row),
          codigo: productCode(row),
          stock: row.stock_nuevo,
          cantidad: row.delta,
          responsable: responsible(row, "solicitado_por"),
          motivo: row.motivo,
          historial: String(row.estado ?? "solicitud"),
        })),
        ...rows(defectives.data).map((row) => ({
          tipo: "defectuoso",
          fecha: row.created_at,
          sucursal: branchName(row),
          producto: productName(row),
          codigo: productCode(row),
          cantidad: row.cantidad,
          responsable: responsible(row, "reportado_por"),
          motivo: row.motivo,
          historial: "control histórico; no modifica stock",
        })),
      ];
      downloadCsv(`altix-inventario-${new Date().toISOString().slice(0, 10)}.csv`, ["tipo", "fecha", "sucursal", "producto", "codigo", "stock", "cantidad", "movimiento", "total", "responsable", "motivo", "historial"], data);
      onDone("Descarga administrativa generada correctamente.");
    } catch (err) {
      onError(friendlyAdminError(err, "No se pudo generar la descarga administrativa."));
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      onClick={() => void exportInventory()}
      disabled={loading}
      title="Descargar inventario"
      className="inline-flex items-center gap-2 border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-50 hover:border-blue-500 hover:text-blue-700"
    >
      <Download size={16} />
      {loading ? "Preparando archivo..." : inventoryRows ? "Descargar inventario CSV" : "Descargar CSV"}
    </button>
  );
};

async function loadRows(resource: Resource): Promise<AdminRow[]> {
  switch (resource) {
    case "ventas": {
      const result = await supabase
        .from("ventas")
        .select("*, clientes(nombre), sucursales(nombre), profiles!ventas_vendedor_id_fkey(nombre_completo)")
        .order("created_at", { ascending: false });
      if (result.error) throw result.error;
      return rows(result.data);
    }
    case "cotizaciones": {
      const result = await supabase
        .from("cotizaciones")
        .select("*, clientes(nombre), sucursales(nombre), profiles!cotizaciones_vendedor_id_fkey(nombre_completo)")
        .order("created_at", { ascending: false });
      if (result.error) throw result.error;
      const quoteRows = rows(result.data);
      const quoteIds = quoteRows.map((row) => String(row.id)).filter(Boolean);
      if (quoteIds.length === 0) return quoteRows;
      const approvals = await supabase.from("aprobaciones").select("referencia_id,estado").eq("tipo", "descuento").eq("referencia_tabla", "cotizaciones").in("referencia_id", quoteIds).order("created_at", { ascending: false });
      if (approvals.error) throw approvals.error;
      const states = new Map<string, string>();
      rows(approvals.data).forEach((approval) => { const id = String(approval.referencia_id ?? ""); if (id && !states.has(id)) states.set(id, String(approval.estado ?? "")); });
      return quoteRows.map((row) => ({ ...row, aprobacion_descuento: states.get(String(row.id)) ?? "sin descuento" }));
    }
    case "pedidos": {
      const result = await supabase
        .from("pedidos")
        .select("*, clientes(nombre), sucursales(nombre), profiles!pedidos_vendedor_id_fkey(nombre_completo), ventas(id)")
        .order("created_at", { ascending: false });
      if (result.error) throw result.error;
      return rows(result.data);
    }
    case "clientes": {
      const result = await supabase.from("clientes").select("*").order("nombre");
      if (result.error) throw result.error;
      return rows(result.data);
    }
    case "productos": {
      const result = await supabase.from("productos").select("*, productos_costos(costo_unitario)").order("nombre");
      if (result.error) throw result.error;
      return rows(result.data).map((row) => ({
        ...row,
        costo_unitario: isRecord(row.productos_costos) ? row.productos_costos.costo_unitario : 0,
      }));
    }
    case "inventarios": {
      const [productResult, branchResult, inventoryResult] = await Promise.all([
        supabase.from("productos").select("id,nombre,sku,activo,precio_base,categorias(nombre),productos_costos(costo_unitario)").eq("activo", true).order("nombre"),
        supabase.from("sucursales").select("id,nombre").eq("activa", true).order("nombre"),
        supabase.from("inventarios").select("sucursal_id,producto_id,stock,stock_minimo,stock_maximo"),
      ]);
      const failed = [productResult, branchResult, inventoryResult].find((result) => result.error);
      if (failed?.error) throw failed.error;
      const inventory = new Map((inventoryResult.data ?? []).map((row) => [`${row.sucursal_id}:${row.producto_id}`, row]));
      return (productResult.data ?? []).flatMap((product) => (branchResult.data ?? []).map((branch) => {
        const stock = inventory.get(`${branch.id}:${product.id}`);
        return { ...stock, sucursal_id: branch.id, producto_id: product.id, productos: product, sucursales: branch, stock: stock?.stock ?? 0, stock_minimo: stock?.stock_minimo ?? 5, stock_maximo: stock?.stock_maximo ?? 1000 };
      }));
    }
    case "sesiones_caja": {
      const result = await supabase
        .from("sesiones_caja")
        .select("*, sucursales(nombre), profiles!sesiones_caja_usuario_id_fkey(nombre_completo)")
        .order("fecha_apertura", { ascending: false });
      if (result.error) throw result.error;
      return rows(result.data);
    }
    case "movimientos_caja": {
      const result = await supabase
        .from("movimientos_caja")
        .select("*, sesiones_caja(sucursal_id, sucursales(nombre))")
        .order("created_at", { ascending: false });
      if (result.error) throw result.error;
      return rows(result.data);
    }
    case "gastos": {
      const result = await supabase
        .from("gastos")
        .select("*, sucursales(nombre), profiles!gastos_registrado_por_fkey(nombre_completo)")
        .order("created_at", { ascending: false });
      if (result.error) throw result.error;
      return rows(result.data);
    }
    case "cuentas_cobrar": {
      const result = await supabase
        .from("cuentas_cobrar")
        .select("*, clientes(nombre), ventas(sucursal_id, vendedor_id, entregada), pedidos(sucursal_id, vendedor_id, estado)")
        .order("fecha_vencimiento");
      if (result.error) throw result.error;
      return rows(result.data);
    }
    case "comisiones": {
      const result = await supabase
        .from("comisiones")
        .select("*, ventas(id), profiles(nombre_completo)")
        .order("created_at", { ascending: false });
      if (result.error) throw result.error;
      return rows(result.data);
    }
    case "bitacora_auditoria": {
      const result = await supabase
        .from("bitacora_auditoria")
        .select("*")
        .order("created_at", { ascending: false });
      if (result.error) throw result.error;
      return rows(result.data);
    }
    case "profiles": {
      const result = await supabase.from("profiles").select("*").order("nombre_completo");
      if (result.error) throw result.error;
      return rows(result.data);
    }
    case "sucursales": {
      const result = await supabase.from("sucursales").select("*").order("nombre");
      if (result.error) throw result.error;
      return rows(result.data);
    }
    case "disenos": {
      const result = await supabase
        .from("disenos")
        .select("*")
        .order("created_at", { ascending: false });
      if (result.error) throw result.error;
      return rows(result.data);
    }
    case "extras": {
      const result = await supabase.from("extras").select("*").order("nombre");
      if (result.error) throw result.error;
      return rows(result.data);
    }
    case "archivos": {
      const result = await supabase
        .from("archivos")
        .select("*")
        .order("created_at", { ascending: false });
      if (result.error) throw result.error;
      return rows(result.data);
    }
    case "traslados": {
      const result = await supabase
        .from("traslados")
        .select("*, origen:sucursales!traslados_sucursal_origen_id_fkey(nombre), destino:sucursales!traslados_sucursal_destino_id_fkey(nombre), profiles!traslados_solicitado_por_fkey(nombre_completo)")
        .order("created_at", { ascending: false });
      if (result.error) throw result.error;
      return rows(result.data);
    }
    case "conteos": {
      const result = await supabase
        .from("conteos")
        .select("*, sucursales(nombre), profiles(nombre_completo)")
        .order("created_at", { ascending: false });
      if (result.error) throw result.error;
      return rows(result.data);
    }
    case "ajustes": {
      const result = await supabase
        .from("solicitudes_ajuste_inventario")
        .select("*, productos(nombre,sku), sucursales(nombre)")
        .order("solicitado_at", { ascending: false });
      if (result.error) throw result.error;
      return rows(result.data);
    }
    case "movimientos_inventario": {
      const result = await supabase
        .from("movimientos_inventario")
        .select("*, productos(nombre,sku), sucursales(nombre), profiles(nombre_completo)")
        .order("created_at", { ascending: false });
      if (result.error) throw result.error;
      return rows(result.data);
    }
    case "defectuosos": {
      const result = await supabase
        .from("defectuosos")
        .select("*, productos(nombre,sku), sucursales(nombre), profiles(nombre_completo)")
        .order("created_at", { ascending: false });
      if (result.error) throw result.error;
      return rows(result.data);
    }
  }
}

const configs: Record<
  string,
  {
    title: string;
    description: string;
    resource: Resource;
    columns: Array<[string, string]>;
    rowActions?: AdminAction[];
    headerAction?: AdminAction;
  }
> = {
  dashboard: {
    title: "Dashboard administrativo",
    description: "Resumen de actividad del negocio.",
    resource: "ventas",
    columns: [["Fecha", "created_at"]],
  },
  ventas: {
    title: "Ventas",
    description: "Consulta y seguimiento de ventas registradas.",
    resource: "ventas",
    columns: [
      ["Folio", "id"],
      ["Fecha", "created_at"],
      ["Sucursal", "sucursales"],
      ["Vendedor", "profiles"],
      ["Total", "total"],
      ["Cliente", "clientes"],
      ["Forma de pago", "forma_pago"],
      ["Estado", "entregada"],
    ],
    rowActions: ["sale-deliver", "sale-return"],
  },
  cotizaciones: {
    title: "Cotizaciones",
    description: "Consulta de cotizaciones comerciales registradas.",
    resource: "cotizaciones",
    columns: [
      ["Fecha", "created_at"],
      ["Cliente", "clientes"],
      ["Total", "total"],
      ["Estado", "estado"],
      ["Aprobación descuento", "aprobacion_descuento"],
      ["Pago", "metodo_pago"],
    ],
    rowActions: ["quote-convert"],
  },
  pedidos: {
    title: "Pedidos",
    description: "Consulta de pedidos y su estado operativo.",
    resource: "pedidos",
    columns: [
      ["Fecha", "created_at"],
      ["Cliente", "clientes"],
      ["Total", "total"],
      ["Saldo", "saldo_pendiente"],
      ["Estado", "estado"],
      ["Pago", "metodo_pago"],
    ],
    rowActions: ["order-progress", "order-advance", "order-deliver", "order-finalize"],
  },
  clientes: {
    title: "Clientes",
    description: "Clientes finales y cuentas mayoristas.",
    resource: "clientes",
    columns: [
      ["Nombre", "nombre"],
      ["NIT / DPI", "nit_dpi"],
      ["Teléfono", "telefono"],
      ["Tipo", "es_mayorista"],
      ["Estado", "activo"],
    ],
  },
  mayoristas: {
    title: "Mayoristas",
    description: "Cartera mayorista y relaciones comerciales.",
    resource: "clientes",
    columns: [
      ["Nombre", "nombre"],
      ["NIT / DPI", "nit_dpi"],
      ["Teléfono", "telefono"],
      ["Estado", "activo"],
    ],
  },
  productos: {
    title: "Productos",
    description: "Catálogo, precios y disponibilidad comercial.",
    resource: "productos",
    columns: [
      ["Código", "sku"],
      ["Nombre", "nombre"],
      ["Precio base", "precio_base"],
      ["Mayorista", "precio_mayorista"],
      ["Costo", "costo_unitario"],
      ["Estado", "activo"],
    ],
    rowActions: ["product-cost"],
  },
  inventario: {
    title: "Inventario",
    description: "Existencias por sucursal y producto.",
    resource: "inventarios",
    columns: [
      ["Producto", "productos"],
      ["Sucursal", "sucursales"],
      ["Stock", "stock"],
      ["Mínimo", "stock_minimo"],
    ],
    rowActions: [
      "inventory-entry",
      "inventory-transfer",
      "inventory-defective",
      "inventory-adjust-request",
    ],
  },
  caja: {
    title: "Caja",
    description: "Sesiones de caja y movimientos operativos.",
    resource: "sesiones_caja",
    columns: [
      ["Apertura", "fecha_apertura"],
      ["Sucursal", "sucursales"],
      ["Monto inicial", "monto_apertura"],
      ["Físico", "monto_cierre"],
      ["Esperado", "monto_esperado"],
      ["Diferencia", "diferencia"],
      ["Estado", "estado"],
    ],
    rowActions: ["cash-close", "cash-expense", "cash-movement"],
    headerAction: "cash-open",
  },
  "caja-movimientos": {
    title: "Movimientos de caja",
    description: "Historial de ingresos y egresos por sesión.",
    resource: "movimientos_caja",
    columns: [
      ["Fecha", "created_at"],
      ["Tipo", "tipo"],
      ["Monto", "monto"],
      ["Concepto", "concepto"],
      ["Sesión", "sesiones_caja"],
    ],
  },
  gastos: {
    title: "Gastos",
    description: "Gastos registrados y resolución de autorización.",
    resource: "gastos",
    columns: [
      ["Fecha", "created_at"],
      ["Categoría", "categoria"],
      ["Concepto", "descripcion"],
      ["Monto", "monto"],
      ["Estado", "estado"],
    ],
    rowActions: ["expense-approve", "expense-reject"],
  },
  creditos: {
    title: "Créditos",
    description: "Cartera mayorista, límites, vencimientos y pagos.",
    resource: "cuentas_cobrar",
    columns: [
      ["Cliente", "clientes"],
      ["Total", "monto_total"],
      ["Pagado", "monto_pagado"],
      ["Saldo", "saldo_pendiente"],
      ["Vencimiento", "fecha_vencimiento"],
      ["Estado", "estado"],
    ],
    rowActions: ["credit-payment"],
  },
  comisiones: {
    title: "Comisiones",
    description: "Resultados calculados por PostgreSQL. Esta vista es de solo lectura.",
    resource: "comisiones",
    columns: [
      ["Venta", "ventas"],
      ["Base", "monto_venta"],
      ["Porcentaje", "porcentaje_aplicado"],
      ["Monto", "monto_comision"],
      ["Periodo", "periodo"],
    ],
  },
  auditoria: {
    title: "Auditoría",
    description: "Registro inmutable de acciones y cambios.",
    resource: "bitacora_auditoria",
    columns: [
      ["Fecha", "created_at"],
      ["Usuario", "profiles"],
      ["Acción", "accion"],
      ["Módulo", "tabla_afectada"],
      ["Registro", "registro_id"],
    ],
  },
  vendedores: {
    title: "Vendedores",
    description: "Usuarios, roles y estado operativo.",
    resource: "profiles",
    columns: [
      ["Nombre", "nombre_completo"],
      ["Rol", "role"],
      ["Estado", "activo"],
      ["Alta", "created_at"],
    ],
  },
  sucursales: {
    title: "Sucursales",
    description: "Sucursales, operación y disponibilidad.",
    resource: "sucursales",
    columns: [
      ["Nombre", "nombre"],
      ["Dirección", "direccion"],
      ["Teléfono", "telefono"],
      ["Estado", "activa"],
    ],
  },
  disenos: {
    title: "Diseños",
    description: "Biblioteca visual asociada a clientes.",
    resource: "disenos",
    columns: [
      ["Nombre", "nombre"],
      ["Cliente", "clientes"],
      ["Archivo", "archivo_url"],
      ["Fecha", "created_at"],
    ],
  },
  extras: {
    title: "Extras",
    description: "Servicios adicionales para cotizaciones y pedidos.",
    resource: "extras",
    columns: [
      ["Nombre", "nombre"],
      ["Precio adicional", "precio_adicional"],
      ["Estado", "activo"],
    ],
  },
  lanzamientos: {
    title: "Lanzamientos",
    description: "Campañas y publicaciones del catálogo.",
    resource: "archivos",
    columns: [
      ["Archivo", "nombre_original"],
      ["Tipo", "mime_type"],
      ["Fecha", "created_at"],
    ],
  },
  traslados: {
    title: "Traslados",
    description: "Movimientos de inventario entre sucursales.",
    resource: "traslados",
    columns: [
      ["Origen", "origen"],
      ["Destino", "destino"],
      ["Solicitante", "profiles"],
      ["Estado", "estado"],
      ["Pago", "metodo_pago"],
      ["Solicitud", "created_at"],
    ],
  },
  kardex: {
    title: "Kardex",
    description: "Historial de movimientos con saldos y responsable.",
    resource: "movimientos_inventario",
    columns: [
      ["Fecha", "created_at"],
      ["Producto", "productos"],
      ["Sucursal", "sucursales"],
      ["Movimiento", "tipo"],
      ["Cantidad", "cantidad"],
      ["Saldo nuevo", "stock_nuevo"],
      ["Responsable", "profiles"],
    ],
  },
  defectuosos: {
    title: "Defectuosos",
    description: "Control histórico sin reducción de inventario disponible.",
    resource: "defectuosos",
    columns: [
      ["Fecha", "created_at"],
      ["Producto", "productos"],
      ["Sucursal", "sucursales"],
      ["Cantidad", "cantidad"],
      ["Motivo", "motivo"],
      ["Responsable", "profiles"],
    ],
  },
  conteo: {
    title: "Conteo físico",
    description: "Conteos parciales por sucursal sin bloquear ventas.",
    resource: "conteos",
    columns: [
      ["Sucursal", "sucursales"],
      ["Estado", "estado"],
      ["Fecha", "created_at"],
      ["Realizado por", "profiles"],
    ],
    rowActions: ["count-save"],
    headerAction: "count-create",
  },
  aprobaciones: {
    title: "Aprobaciones",
    description: "Solicitudes de ajuste de inventario pendientes de resolución.",
    resource: "ajustes",
    columns: [
      ["Producto", "productos"],
      ["Sucursal", "sucursales"],
      ["Anterior", "stock_anterior"],
      ["Nuevo", "stock_nuevo"],
      ["Motivo", "motivo"],
      ["Estado", "estado"],
    ],
    rowActions: ["inventory-adjust-approve", "inventory-adjust-reject"],
  },
  reportes: {
    title: "Reportes",
    description: "Consultas operativas listas para filtrar y exportar.",
    resource: "ventas",
    columns: [
      ["Fecha", "created_at"],
      ["Sucursal", "sucursales"],
      ["Total", "total"],
    ],
  },
  configuracion: {
    title: "Configuración",
    description: "Información operativa de la sesión y sucursales.",
    resource: "sucursales",
    columns: [
      ["Sucursal", "nombre"],
      ["Dirección", "direccion"],
      ["Estado", "activa"],
    ],
  },
};

const pendingModules: Record<string, string> = {};

const AdminApprovalsPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { profile } = useAuth();
  const [items, setItems] = useState<AdminRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [branches, setBranches] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const [approvalRows, profileRows, branchRows] = await Promise.all([
      supabase.from("aprobaciones").select("*").order("estado").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,nombre_completo"),
      supabase.from("sucursales").select("id,nombre"),
    ]);
    const failed = [approvalRows, profileRows, branchRows].find((result) => result.error);
    if (failed?.error) setError(friendlyAdminError(failed.error, "No se pudo cargar el centro de aprobaciones."));
    else {
      setItems(rows(approvalRows.data));
      setProfiles(Object.fromEntries((profileRows.data ?? []).map((item) => [item.id, item.nombre_completo])));
      setBranches(Object.fromEntries((branchRows.data ?? []).map((item) => [item.id, item.nombre])));
    }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const resolve = async (item: AdminRow, approve: boolean) => {
    if (!profile?.id || !window.confirm(`${approve ? "Aprobar" : "Rechazar"} esta solicitud?`)) return;
    setBusy(String(item.id)); setError(null);
    try {
      if (item.tipo === "ajuste_inventario") {
        if (approve) await adminService.aprobarAjuste({ p_ajuste_id: String(item.referencia_id), p_aprobado_por: profile.id });
        else await adminService.rechazarAjuste({ p_ajuste_id: String(item.referencia_id), p_rechazado_por: profile.id });
      } else if (item.tipo === "gasto") {
        await adminService.resolverGasto({ p_gasto_id: String(item.referencia_id), p_aprobador_id: profile.id, p_aprobar: approve });
      } else {
        await adminService.resolverAprobacion({ p_aprobacion_id: String(item.id), p_revisado_por: profile.id, p_aprobar: approve });
      }
      setSuccess(approve ? "Solicitud aprobada." : "Solicitud rechazada.");
      await load();
    } catch (err) { setError(friendlyAdminError(err, "No se pudo resolver la solicitud.")); }
    finally { setBusy(null); }
  };
  return <PageFrame title="Centro de aprobaciones" description="Solicitudes pendientes y resoluciones trazables." showHeader={!embedded} onRefresh={() => void load()}>{error && <p className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{success && <p className="mb-4 border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</p>}{loading ? <State message="Cargando solicitudes..." /> : items.length === 0 ? <State message="No hay solicitudes registradas." /> : <div className="overflow-x-auto border border-gray-200 bg-white"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>{["Estado", "Tipo", "Solicitante", "Sucursal", "Referencia", "Valor", "Motivo", "Creada", "Revisión", "Acciones"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{items.map((item) => { const pending = item.estado === "pendiente"; return <tr key={String(item.id)} className={pending ? "bg-amber-50/30" : ""}><td className="px-4 py-3 font-medium">{String(item.estado)}</td><td className="px-4 py-3">{String(item.tipo)}</td><td className="px-4 py-3">{profiles[String(item.solicitante_id)] ?? "Usuario"}</td><td className="px-4 py-3">{branches[String(item.sucursal_id)] ?? "Sucursal"}</td><td className="px-4 py-3"><details><summary className="cursor-pointer text-blue-700">Ver</summary><span className="text-xs text-gray-500">{String(item.referencia_tabla ?? "—")} · #{String(item.referencia_id ?? "").slice(0, 8).toUpperCase()}</span><ApprovalDetails item={item} /></details></td><td className="px-4 py-3">{item.valor_solicitado == null ? "—" : money(item.valor_solicitado)}</td><td className="max-w-[240px] truncate px-4 py-3">{String(item.motivo)}</td><td className="px-4 py-3">{date(item.created_at)}</td><td className="max-w-[180px] truncate px-4 py-3">{String(item.nota_resolucion ?? "—")}</td><td className="px-4 py-3">{pending ? <div className="flex gap-2"><button type="button" disabled={busy === String(item.id)} onClick={() => void resolve(item, true)} className="border border-green-300 px-2 py-1 text-xs text-green-700 disabled:opacity-50">Aprobar</button><button type="button" disabled={busy === String(item.id)} onClick={() => void resolve(item, false)} className="border border-red-300 px-2 py-1 text-xs text-red-700 disabled:opacity-50">Rechazar</button></div> : <span className="text-xs text-gray-500">Resuelta</span>}</td></tr>; })}</tbody></table></div>}</PageFrame>;
};

const ApprovalDetails: React.FC<{ item: AdminRow }> = ({ item }) => {
  const requested = isRecord(item.datos_solicitados) ? item.datos_solicitados : {};
  const lines = Array.isArray(requested.lineas) ? requested.lineas.filter(isRecord) : [];
  if (item.tipo !== "descuento" || lines.length === 0) {
    return <pre className="mt-2 max-w-[320px] whitespace-pre-wrap text-xs">{JSON.stringify(item.datos_solicitados ?? {}, null, 2)}</pre>;
  }
  return <div className="mt-2 max-w-[420px] space-y-2 text-xs"><p className="font-medium">Descuento total: {money(requested.total_descuento)}</p>{lines.map((line, index) => <div key={index} className="border-t border-gray-100 pt-2"><p>Línea {String(line.linea ?? index + 1)} · {String(line.cantidad ?? 0)} unidad(es)</p><p className="text-gray-600">Oficial: {money(line.precio_oficial_unitario)} · Descuento: {money(line.descuento_total)} · Total: {money(line.total_linea)}</p></div>)}</div>;
};

const AdminCashMovementsPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [movements, setMovements] = useState<AdminRow[]>([]);
  const [branchId, setBranchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const [branchRows, movementRows] = await Promise.all([
      supabase.from("sucursales").select("id,nombre").eq("activa", true).order("nombre"),
      supabase.from("movimientos_caja").select("*, sesiones_caja(sucursal_id, sucursales(nombre), profiles!sesiones_caja_usuario_id_fkey(nombre_completo))").order("created_at", { ascending: false }),
    ]);
    const failed = [branchRows, movementRows].find((result) => result.error);
    if (failed?.error) setError(friendlyAdminError(failed.error, "No se pudieron cargar los movimientos de caja."));
    else { setBranches((branchRows.data ?? []) as Branch[]); setMovements(rows(movementRows.data)); }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => movements.filter((movement) => {
    const session = isRecord(movement.sesiones_caja) ? movement.sesiones_caja : {};
    return !branchId || String(session.sucursal_id ?? "") === branchId;
  }), [movements, branchId]);
  const income = filtered.filter((row) => row.tipo === "ingreso").reduce((sum, row) => sum + Number(row.monto ?? 0), 0);
  const expense = filtered.filter((row) => row.tipo === "egreso").reduce((sum, row) => sum + Number(row.monto ?? 0), 0);
  return <PageFrame title="Movimientos de caja" description="Ingresos y egresos separados por sucursal, con totales recalculados." showHeader={!embedded} onRefresh={() => void load()}>{error && <p className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="mb-4 grid gap-3 border border-gray-200 bg-white p-4 md:grid-cols-4"><label className="text-sm md:col-span-2">Sucursal<select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="mt-1 w-full border border-gray-300 px-3 py-2"><option value="">Todas las sucursales</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.nombre}</option>)}</select></label><div><p className="text-xs uppercase text-gray-500">Ingresos</p><p className="mt-1 font-semibold text-green-700">{money(income)}</p></div><div><p className="text-xs uppercase text-gray-500">Egresos / neto</p><p className="mt-1 font-semibold text-red-700">{money(expense)} <span className="text-gray-700">/ {money(income - expense)}</span></p></div></div>{loading ? <State message="Cargando movimientos..." /> : filtered.length === 0 ? <State message="No hay movimientos para el filtro seleccionado." /> : <div className="overflow-x-auto border border-gray-200 bg-white"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>{["Fecha", "Sucursal", "Sesión", "Tipo", "Ingreso", "Egreso", "Concepto", "Responsable"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{filtered.map((movement) => { const session = isRecord(movement.sesiones_caja) ? movement.sesiones_caja : {}; const branch = isRecord(session.sucursales) ? session.sucursales.nombre : "Sucursal"; const responsible = isRecord(session.profiles) ? session.profiles.nombre_completo : "—"; return <tr key={String(movement.id)}><td className="px-4 py-3">{date(movement.created_at)}</td><td className="px-4 py-3">{String(branch)}</td><td className="px-4 py-3">#{String(movement.sesion_caja_id ?? "").slice(0, 8).toUpperCase()}</td><td className="px-4 py-3">{movement.tipo === "ingreso" ? "Ingreso" : "Egreso"}</td><td className="px-4 py-3 text-green-700">{movement.tipo === "ingreso" ? money(movement.monto) : "—"}</td><td className="px-4 py-3 text-red-700">{movement.tipo === "egreso" ? money(movement.monto) : "—"}</td><td className="px-4 py-3">{String(movement.concepto ?? "—")}</td><td className="px-4 py-3">{String(responsible ?? "—")}</td></tr>; })}</tbody></table></div>}</PageFrame>;
};

const AdminAuditPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [items, setItems] = useState<AdminRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [branches, setBranches] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState({ from: "", to: "", user: "", module: "", action: "", branch: "" });
  const [selected, setSelected] = useState<AdminRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const [auditRows, profileRows, branchRows] = await Promise.all([
      supabase.from("bitacora_auditoria").select("*").order("created_at", { ascending: false }).limit(1000),
      supabase.from("profiles").select("id,nombre_completo"),
      supabase.from("sucursales").select("id,nombre"),
    ]);
    const failed = [auditRows, profileRows, branchRows].find((result) => result.error);
    if (failed?.error) setError(friendlyAdminError(failed.error, "No se pudo cargar la auditoría."));
    else { setItems(rows(auditRows.data)); setProfiles(Object.fromEntries((profileRows.data ?? []).map((item) => [item.id, item.nombre_completo]))); setBranches(Object.fromEntries((branchRows.data ?? []).map((item) => [item.id, item.nombre]))); }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => items.filter((item) => { const when = String(item.created_at ?? "").slice(0, 10); return (!filters.from || when >= filters.from) && (!filters.to || when <= filters.to) && (!filters.user || String(item.usuario_id) === filters.user) && (!filters.module || String(item.tabla_afectada).toLowerCase().includes(filters.module.toLowerCase())) && (!filters.action || String(item.accion).toLowerCase() === filters.action.toLowerCase()) && (!filters.branch || String(item.sucursal_id) === filters.branch); }), [items, filters]);
  return <PageFrame title="Auditoría" description="Registro inmutable de cambios críticos." showHeader={!embedded} onRefresh={() => void load()}>{error && <p className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="mb-4 grid gap-2 border border-gray-200 bg-white p-3 md:grid-cols-3 lg:grid-cols-6"><input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} className="border border-gray-300 px-2 py-2 text-sm" /><input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} className="border border-gray-300 px-2 py-2 text-sm" /><select value={filters.user} onChange={(event) => setFilters({ ...filters, user: event.target.value })} className="border border-gray-300 px-2 py-2 text-sm"><option value="">Todos los usuarios</option>{Object.entries(profiles).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><input placeholder="Módulo" value={filters.module} onChange={(event) => setFilters({ ...filters, module: event.target.value })} className="border border-gray-300 px-2 py-2 text-sm" /><select value={filters.action} onChange={(event) => setFilters({ ...filters, action: event.target.value })} className="border border-gray-300 px-2 py-2 text-sm"><option value="">Todas las acciones</option><option value="INSERT">INSERT</option><option value="UPDATE">UPDATE</option><option value="DELETE">DELETE</option></select><select value={filters.branch} onChange={(event) => setFilters({ ...filters, branch: event.target.value })} className="border border-gray-300 px-2 py-2 text-sm"><option value="">Todas las sucursales</option>{Object.entries(branches).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>{loading ? <State message="Cargando auditoría..." /> : <div className="overflow-x-auto border border-gray-200 bg-white"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>{["Fecha", "Usuario", "Sucursal", "Acción", "Módulo", "Registro", "Detalle"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{filtered.map((item) => <tr key={String(item.id)}><td className="px-4 py-3">{date(item.created_at)}</td><td className="px-4 py-3">{profiles[String(item.usuario_id)] ?? "Sistema"}</td><td className="px-4 py-3">{branches[String(item.sucursal_id)] ?? "—"}</td><td className="px-4 py-3">{String(item.accion)}</td><td className="px-4 py-3">{String(item.tabla_afectada)}</td><td className="px-4 py-3">{String(item.registro_id ?? "—")}</td><td className="px-4 py-3"><button type="button" onClick={() => setSelected(item)} className="text-xs font-medium text-blue-700">Ver detalle</button></td></tr>)}</tbody></table></div>}{selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/30 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-gray-200 bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Detalle de auditoría</h2><button type="button" title="Cerrar" onClick={() => setSelected(null)} className="text-gray-500">Cerrar</button></div><pre className="mt-4 whitespace-pre-wrap text-xs">{JSON.stringify({ anteriores: selected.datos_anteriores, nuevos: selected.datos_nuevos }, null, 2)}</pre></div></div>}</PageFrame>;
};

const AdminSaleDetail: React.FC<{ row: AdminRow; onClose: () => void }> = ({ row, onClose }) => {
  const [items, setItems] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void supabase.from("venta_items").select("id,cantidad,precio_unitario,subtotal,productos(nombre,sku),venta_costos(costo_unitario)").eq("venta_id", String(row.id)).then((result) => {
      if (!active) return;
      if (result.error) setError(friendlyAdminError(result.error, "No se pudo cargar el detalle de la venta."));
      else setItems(rows(result.data));
      setLoading(false);
    });
    return () => { active = false; };
  }, [row.id]);
  const totalCost = items.reduce((sum, item) => {
    const snapshot = isRecord(item.venta_costos) ? item.venta_costos : {};
    return sum + Number(snapshot.costo_unitario ?? 0) * Number(item.cantidad ?? 0);
  }, 0);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/30 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-gray-200 bg-white p-5 shadow-xl"><div className="flex items-center justify-between border-b border-gray-200 pb-4"><h2 className="font-semibold">Detalle de venta #{String(row.id).slice(0, 8).toUpperCase()}</h2><button type="button" title="Cerrar" onClick={onClose} className="p-1 text-gray-500 hover:bg-gray-100">Cerrar</button></div><dl className="grid grid-cols-2 gap-3 py-4 text-sm"><dt className="text-gray-500">Fecha</dt><dd className="text-right">{date(row.created_at)}</dd><dt className="text-gray-500">Sucursal</dt><dd className="text-right">{renderValue(row.sucursales, "sucursales")}</dd><dt className="text-gray-500">Vendedor</dt><dd className="text-right">{renderValue(row.profiles, "profiles")}</dd><dt className="text-gray-500">Cliente</dt><dd className="text-right">{renderValue(row.clientes, "clientes")}</dd><dt className="text-gray-500">Forma de pago</dt><dd className="text-right">{renderValue(row.forma_pago, "forma_pago")}</dd><dt className="text-gray-500">Estado</dt><dd className="text-right">{renderValue(row.entregada, "entregada")}</dd><dt className="font-medium">Total</dt><dd className="text-right text-lg font-semibold">{money(row.total)}</dd></dl>{loading ? <State message="Cargando productos..." /> : error ? <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : <div className="border-t border-gray-200 pt-4"><h3 className="text-sm font-semibold">Productos</h3>{items.length === 0 ? <State message="No hay productos asociados." /> : <div className="mt-3 divide-y divide-gray-100">{items.map((item) => { const product = isRecord(item.productos) ? item.productos : {}; return <div key={String(item.id)} className="flex items-center justify-between gap-4 py-3 text-sm"><div><p className="font-medium">{String(product.nombre ?? "Producto")}</p><p className="text-xs text-gray-500">{String(product.sku ?? "—")} · {String(item.cantidad ?? 0)} × {money(item.precio_unitario)}</p></div><span className="font-medium">{money(item.subtotal)}</span></div>; })}<div className="flex justify-between pt-3 text-sm"><span className="text-gray-500">Costo congelado</span><span>{money(totalCost)}</span></div><div className="flex justify-between pt-1 text-sm font-medium"><span>Utilidad bruta</span><span>{money(Number(row.total ?? 0) - totalCost)}</span></div></div>}</div>}</div></div>;
};

const AdminDataListPage: React.FC<{ module: string; embedded?: boolean }> = ({
  module,
  embedded = false,
}) => {
  const config = configs[module] ?? configs.dashboard;
  const [data, setData] = useState<AdminRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [saleDetail, setSaleDetail] = useState<AdminRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loadRows(config.resource));
    } catch (err) {
      setError(friendlyAdminError(err, "No se pudo cargar la información."));
    } finally {
      setLoading(false);
    }
  }, [config.resource]);
  // The initial fetch synchronizes the page with the selected backend resource.
  // eslint-disable-next-line react/set-state-in-effect
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (module !== "inventario") {
      setBranches([]);
      setBranchId("");
      return;
    }
    void supabase.from("sucursales").select("id,nombre").eq("activa", true).order("nombre").then((result) => {
      if (result.error) setError(friendlyAdminError(result.error, "No se pudieron cargar las sucursales."));
      else setBranches((result.data ?? []) as Branch[]);
    });
  }, [module]);

  const filtered = useMemo(() => {
    const needle = search.toLowerCase().trim();
    const branchFiltered = module === "inventario" && branchId ? data.filter((row) => String(row.sucursal_id ?? "") === branchId) : data;
    if (!needle) return branchFiltered;
    return branchFiltered.filter((row) =>
      Object.values(row).some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(needle),
      ),
    );
  }, [data, search, module, branchId]);

  const canUse = (action: AdminAction, row: AdminRow) => {
    if (action === "cash-close" || action === "cash-expense") return row.estado === "abierta";
    if (action === "credit-payment") return Number(row.saldo_pendiente ?? 0) > 0;
    if (action === "quote-convert") return row.estado === "enviada" && !["pendiente", "rechazada"].includes(String(row.aprobacion_descuento));
    if (action === "order-advance")
      return (
        Number(row.saldo_pendiente ?? 0) > 0 &&
        !["entregado", "cancelado"].includes(String(row.estado))
      );
    if (action === "order-progress") return ["pendiente", "en_produccion"].includes(String(row.estado));
    if (action === "order-deliver") return String(row.estado) === "listo";
    if (action === "order-finalize")
      return String(row.estado) === "entregado" && Number(row.saldo_pendiente ?? 0) === 0
        && !(Array.isArray(row.ventas) && row.ventas.length > 0);
    if (action === "cash-movement") return row.estado === "abierta";
    if (action === "inventory-adjust-approve" || action === "inventory-adjust-reject")
      return row.estado === "pendiente";
    if (action === "sale-return") return Boolean(row.id);
    if (action === "sale-deliver") return row.entregada !== true;
    if (action === "count-save") return row.estado === "en_proceso";
    if (action === "expense-approve" || action === "expense-reject")
      return row.estado === "pendiente";
    return true;
  };
  const actionDone = (message: string) => {
    setSuccess(message);
    void load();
  };
  const headerActions = (
    <>
      {config.headerAction && (
        <AdminActionButton action={config.headerAction} onDone={actionDone} />
      )}
      {(module === "inventario" || module === "reportes") && (
        <>{module === "inventario" && <label className="text-xs text-gray-500">Sucursal<select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="ml-2 border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900"><option value="">Todas las sucursales</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.nombre}</option>)}</select></label>}<AdminExportButton inventoryRows={module === "inventario" ? filtered : undefined} onDone={setSuccess} onError={setError} /></>
      )}
    </>
  );
  return (
    <PageFrame
      title={config.title}
      description={config.description}
      onRefresh={() => void load()}
      showHeader={!embedded}
      headerActions={headerActions}
    >
      <div className="mb-5 flex flex-col gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar"
            className="w-full border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-600"
          />
        </div>
      </div>
      {loading && <State message="Cargando información..." />}
      {error && (
        <div className="flex items-center justify-between border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span className="flex items-center gap-2">
            <CircleAlert size={16} /> No se pudo cargar esta vista.
          </span>
          <button onClick={() => void load()} className="font-medium underline">
            Reintentar
          </button>
        </div>
      )}
      {success && (
        <div className="border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <State message="No hay registros para mostrar." />
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className="overflow-x-auto border border-gray-200 bg-white">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                {config.columns.map(([label]) => (
                  <th key={label} className="px-4 py-3 font-medium">
                    {label}
                  </th>
                ))}
                {config.rowActions && <th className="px-4 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((row, index) => (
                <tr key={String(row.id ?? index)} className="hover:bg-gray-50">
                  {config.columns.map(([label, key]) => (
                    <td key={label} className="max-w-[220px] truncate px-4 py-3 text-gray-700">
                      {renderValue(row[key], key)}
                    </td>
                  ))}
                  {config.rowActions && (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {config.rowActions
                          .filter((action) => canUse(action, row))
                          .map((action) => (
                            <AdminActionButton
                              key={action}
                              action={action}
                              row={row}
                              onDone={actionDone}
                            />
                          ))}
                        {module === "ventas" && Boolean(row.id) && <button type="button" onClick={() => setSaleDetail(row)} className="text-xs font-medium text-blue-700">Ver detalle</button>}
                        {(module === "ventas" || module === "pedidos" || (module === "cotizaciones" && !["pendiente", "rechazada"].includes(String(row.aprobacion_descuento)))) && Boolean(row.id) && (
                          <PrintDocumentButton kind={module === "ventas" ? "sale" : module === "cotizaciones" ? "quotation" : "order"} documentId={String(row.id)} />
                        )}
                      </div>
                    </td>
                  )}
                  {!config.rowActions && (module === "ventas" || module === "pedidos" || (module === "cotizaciones" && !["pendiente", "rechazada"].includes(String(row.aprobacion_descuento)))) && (
                    <td className="px-4 py-3 text-right"><PrintDocumentButton kind={module === "ventas" ? "sale" : module === "cotizaciones" ? "quotation" : "order"} documentId={String(row.id)} /></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {saleDetail && <AdminSaleDetail row={saleDetail} onClose={() => setSaleDetail(null)} />}
    </PageFrame>
  );
};

export const AdminListPage: React.FC<{ module: string; embedded?: boolean }> = ({
  module,
  embedded = false,
}) => {
  const config = configs[module] ?? configs.dashboard;
  if (module === "creditos") return <AdminCreditPage embedded={embedded} />;
  if (module === "reportes") return <AdminReportsPage embedded={embedded} />;
  if (module === "aprobaciones") return <AdminApprovalsPage embedded={embedded} />;
  if (module === "caja-movimientos") return <AdminCashMovementsPage embedded={embedded} />;
  if (module === "auditoria") return <AdminAuditPage embedded={embedded} />;
  if (pendingModules[module])
    return (
      <PageFrame title={config.title} description={config.description} showHeader={!embedded}>
        <State message={pendingModules[module]} />
      </PageFrame>
    );
  return <AdminDataListPage module={module} embedded={embedded} />;
};

const AdminCreditPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { profile } = useAuth();
  const [clients, setClients] = useState<AdminRow[]>([]);
  const [accounts, setAccounts] = useState<AdminRow[]>([]);
  const [payments, setPayments] = useState<AdminRow[]>([]);
  const [selected, setSelected] = useState<AdminRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [summary, setSummary] = useState({ dueSoon: 0, overdue: 0 });
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [clientRows, accountRows, paymentRows] = await Promise.all([
      supabase.from("clientes").select("*").eq("es_mayorista", true).order("nombre"),
      supabase
        .from("cuentas_cobrar")
        .select("*, clientes(nombre), ventas(sucursal_id, vendedor_id, entregada), pedidos(sucursal_id, vendedor_id, estado)")
        .order("fecha_vencimiento"),
      supabase
        .from("pagos_credito")
        .select("*, cuentas_cobrar(cliente_id, venta_id)")
        .order("created_at", { ascending: false }),
    ]);
    const failed = [clientRows, accountRows, paymentRows].find((result) => result.error);
    if (failed?.error)
      setError(friendlyAdminError(failed.error, "No se pudo cargar la cartera de crédito."));
    else {
      const nextClients = rows(clientRows.data);
      const nextAccounts = rows(accountRows.data);
      const today = new Date();
      const todayText = today.toISOString().slice(0, 10);
      const nextWeekText = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);
      setClients(nextClients);
      setAccounts(nextAccounts);
      setPayments(rows(paymentRows.data));
      setSummary({
        dueSoon: nextAccounts.filter(
          (account) =>
            Number(account.saldo_pendiente ?? 0) > 0 &&
            String(account.fecha_vencimiento) <= nextWeekText,
        ).length,
        overdue: nextAccounts.filter(
          (account) =>
            Number(account.saldo_pendiente ?? 0) > 0 &&
            String(account.fecha_vencimiento) < todayText,
        ).length,
      });
    }
    setLoading(false);
  }, []);
  // The credit screen is synchronized after every RPC so limits and balances never stay stale.
  // eslint-disable-next-line react/set-state-in-effect
  useEffect(() => {
    void load();
  }, [load]);
  const usedByClient = (clientId: string) =>
    accounts
      .filter(
        (account) =>
          String(account.cliente_id) === clientId && Number(account.saldo_pendiente ?? 0) > 0,
      )
      .reduce((sum, account) => sum + Number(account.saldo_pendiente ?? 0), 0);
  const saveTerms = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile?.id || !selected) return;
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await adminService.configurarCredito({
        p_cliente_id: String(selected.id),
        p_monto_autorizado: Number(form.get("monto_autorizado") ?? 0),
        p_dias_credito: Number(form.get("dias_credito") ?? 0),
        p_admin_id: profile.id,
      });
      setSelected(null);
      setSuccess("Términos de crédito actualizados.");
      await load();
    } catch (err) {
      setError(friendlyAdminError(err, "No se pudieron actualizar los términos de crédito."));
    } finally {
      setSaving(false);
    }
  };
  const actionDone = (message: string) => {
    setSuccess(message);
    void load();
  };
  return (
    <PageFrame
      title="Créditos"
      description="Cartera mayorista, límites, vencimientos y pagos."
      showHeader={!embedded}
      onRefresh={() => void load()}
    >
      {error && <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {success && (
        <p className="border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</p>
      )}
      {loading ? (
        <State message="Cargando cartera..." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border border-gray-200 bg-white p-4">
              <p className="text-xs uppercase text-gray-500">Mayoristas</p>
              <p className="mt-2 text-2xl font-semibold">{clients.length}</p>
            </div>
            <div className="border border-gray-200 bg-white p-4">
              <p className="text-xs uppercase text-gray-500">Por vencer 7 días</p>
              <p className="mt-2 text-2xl font-semibold">{summary.dueSoon}</p>
            </div>
            <div className="border border-gray-200 bg-white p-4">
              <p className="text-xs uppercase text-gray-500">Vencidas</p>
              <p className="mt-2 text-2xl font-semibold text-red-700">{summary.overdue}</p>
            </div>
          </div>
          <section className="overflow-x-auto border border-gray-200 bg-white">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  {[
                    "Mayorista",
                    "Solicitado",
                    "Autorizado",
                    "Usado",
                    "Disponible",
                    "Días",
                    "Acción",
                  ].map((label) => (
                    <th key={label} className="px-4 py-3">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clients.map((client) => {
                  const used = usedByClient(String(client.id));
                  const available = Number(client.monto_autorizado ?? 0) - used;
                  return (
                    <tr key={String(client.id)}>
                      <td className="px-4 py-3 font-medium">{String(client.nombre)}</td>
                      <td className="px-4 py-3">{money(client.monto_solicitado)}</td>
                      <td className="px-4 py-3">{money(client.monto_autorizado)}</td>
                      <td className="px-4 py-3">{money(used)}</td>
                      <td className="px-4 py-3">{money(available)}</td>
                      <td className="px-4 py-3">{String(client.dias_credito ?? 0)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelected(client)}
                          className="border border-gray-300 px-2.5 py-1.5 text-xs font-medium hover:border-blue-500 hover:text-blue-700"
                        >
                          Editar términos
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
          <section className="overflow-x-auto border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="font-semibold">Cuentas por cobrar</h2>
            </div>
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  {[
                    "Cliente",
                    "Venta / pedido",
                    "Total",
                    "Pagado",
                    "Pendiente",
                    "Vencimiento",
                    "Estado",
                    "Acción",
                  ].map((label) => (
                    <th key={label} className="px-4 py-3">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accounts.map((account) => (
                  <tr key={String(account.id)}>
                    <td className="px-4 py-3">
                      {isRecord(account.clientes)
                        ? String(account.clientes.nombre)
                        : String(account.cliente_id)}
                    </td>
                    <td className="px-4 py-3">
                      #
                      {String(account.venta_id ?? account.pedido_id ?? "")
                        .slice(0, 8)
                        .toUpperCase()}
                    </td>
                    <td className="px-4 py-3">{money(account.monto_total)}</td>
                    <td className="px-4 py-3">
                      {money(
                        Number(account.monto_total ?? 0) - Number(account.saldo_pendiente ?? 0),
                      )}
                    </td>
                    <td className="px-4 py-3">{money(account.saldo_pendiente)}</td>
                    <td className="px-4 py-3">{String(account.fecha_vencimiento)}</td>
                    <td className="px-4 py-3">{String(account.estado)}</td>
                    <td className="px-4 py-3">
                      {Number(account.saldo_pendiente ?? 0) > 0 && !account.pedido_id && (
                        <AdminActionButton
                          action="credit-payment"
                          row={account}
                          onDone={actionDone}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="overflow-x-auto border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="font-semibold">Historial de pagos</h2>
            </div>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  {["Fecha", "Cuenta", "Monto", "Forma", "Responsable", "Referencia"].map(
                    (label) => (
                      <th key={label} className="px-4 py-3">
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((payment) => (
                  <tr key={String(payment.id)}>
                    <td className="px-4 py-3">{date(payment.created_at)}</td>
                    <td className="px-4 py-3">
                      #
                      {String(payment.cuenta_cobrar_id ?? "")
                        .slice(0, 8)
                        .toUpperCase()}
                    </td>
                    <td className="px-4 py-3">{money(payment.monto)}</td>
                    <td className="px-4 py-3">{String(payment.forma_pago)}</td>
                    <td className="px-4 py-3">{String(payment.registrado_por ?? "—")}</td>
                    <td className="px-4 py-3">{String(payment.referencia ?? "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/30 p-4">
          <form
            onSubmit={saveTerms}
            className="w-full max-w-md space-y-4 border border-gray-200 bg-white p-5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Términos de {String(selected.nombre)}</h2>
              <button
                type="button"
                disabled={saving}
                onClick={() => setSelected(null)}
                className="p-1 text-gray-500"
              >
                ×
              </button>
            </div>
            <label className="block text-sm text-gray-600">
              Monto solicitado
              <input
                disabled
                value={String(selected.monto_solicitado ?? 0)}
                className="mt-1 w-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-gray-600">
              Monto autorizado
              <input
                name="monto_autorizado"
                required
                min="0"
                max={String(selected.monto_solicitado ?? 0)}
                step="0.01"
                type="number"
                defaultValue={String(selected.monto_autorizado ?? 0)}
                className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-gray-600">
              Días de crédito
              <input
                name="dias_credito"
                required
                min="0"
                step="1"
                type="number"
                defaultValue={String(selected.dias_credito ?? 0)}
                className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setSelected(null)}
                className="border border-gray-300 px-3 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar términos"}
              </button>
            </div>
          </form>
        </div>
      )}
    </PageFrame>
  );
};

export const AdminCatalogPage: React.FC = () => {
  const [tab, setTab] = useState<"disenos" | "extras">("disenos");
  const tabs: Array<["disenos" | "extras", string]> = [
    ["disenos", "Diseños"],
    ["extras", "Extras"],
  ];
  return (
    <PageFrame
      title="Catálogo"
      description="Biblioteca visual y servicios complementarios del catálogo."
    >
      <div className="flex gap-6 border-b border-gray-200 text-sm">
        {tabs.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`border-b-2 px-1 pb-3 ${tab === value ? "border-blue-600 font-medium text-blue-700" : "border-transparent text-gray-500 hover:text-gray-900"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "disenos" ? <AdminDesignsPage /> : <AdminExtrasPage />}
    </PageFrame>
  );
};

const renderValue = (value: unknown, key: string) => {
  if (
    key.includes("total") ||
    key.includes("monto") ||
    key.includes("precio") ||
    key.includes("saldo")
  )
    return money(value);
  if (key.includes("created") || key.includes("fecha")) return date(value);
  if (key === "entregada") return value === true ? "Entregada" : "Pendiente";
  if (key === "forma_pago") return String(value ?? "—").replaceAll("_", " ");
  if (typeof value === "boolean") return value ? "Activo" : "Inactivo";
  if (isRecord(value)) return String(value.nombre ?? value.nombre_completo ?? value.sku ?? (value.id ? `#${String(value.id).slice(0, 8).toUpperCase()}` : "—"));
  const text = String(value ?? "—");
  if ((key === "id" || key.endsWith("_id")) && text !== "—") return `#${text.slice(0, 8).toUpperCase()}`;
  return text.length > 32 ? `${text.slice(0, 32)}…` : text;
};

export const AdminDashboardLegacy: React.FC = () => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    void Promise.all(
      [
        ["ventas", "ventas"],
        ["clientes", "clientes"],
        ["productos", "productos"],
        ["creditos", "cuentas_cobrar"],
      ].map(async ([key, table]) => {
        const result = await supabase
          .from(table as "ventas")
          .select("*", { count: "exact", head: true });
        setCounts((previous) => ({ ...previous, [key]: result.count ?? 0 }));
      }),
    );
  }, []);
  return (
    <PageFrame
      title="Dashboard administrativo"
      description="Resumen de actividad del negocio y accesos de control."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Ventas", counts.ventas],
          ["Clientes", counts.clientes],
          ["Productos", counts.productos],
          ["Cuentas por cobrar", counts.creditos],
        ].map(([label, value]) => (
          <div key={String(label)} className="border border-gray-200 bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
            <p className="mt-3 text-2xl font-semibold text-gray-950">{value ?? "—"}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 border-t border-gray-200 pt-6">
        <h2 className="text-base font-semibold text-gray-950">Control operativo</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["/admin/ventas", "Ver ventas"],
            ["/admin/caja", "Ver caja"],
            ["/admin/creditos", "Ver crédito"],
            ["/admin/inventario", "Ver inventario"],
          ].map(([href, label]) => (
            <Link
              key={href}
              to={href}
              className="border border-gray-200 bg-white p-4 text-sm font-medium hover:border-blue-300 hover:text-blue-700"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </PageFrame>
  );
};

export const AdminDashboard = AdminProfitDashboardPage;

const PageFrame = ({
  title,
  description,
  onRefresh,
  showHeader = true,
  headerActions,
  children,
}: {
  title: string;
  description: string;
  onRefresh?: () => void;
  showHeader?: boolean;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="space-y-6">
    {showHeader ? (
      <header className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-gray-400">
            Administración
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-950">{title}</h1>
          <p className="mt-2 text-sm text-gray-500">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Actualizar"
              className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            >
              <RefreshCw size={17} />
            </button>
          )}
          {headerActions}
        </div>
      </header>
    ) : (
      onRefresh && (
        <div className="flex justify-end">
          <button
            onClick={onRefresh}
            title="Actualizar"
            className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      )
    )}
    {children}
  </div>
);
const State = ({ message }: { message: string }) => (
  <div className="border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
    {message}
  </div>
);
