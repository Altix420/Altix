/* eslint-disable react/set-state-in-effect */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, Search, ToggleLeft, ToggleRight, Upload } from "lucide-react";
import { supabase } from "../shared/lib/supabase";
import { friendlyAdminError } from "./admin.errors";
import { adminService } from "./admin.service";
import { compressImageForR2, getSignedR2Url, uploadFileToR2Service } from "../storage/r2.service";

type Product = { id: string; sku: string; nombre: string; precio_base?: number; precio_mayorista?: number; costo_unitario?: number };
type Category = { id: string; nombre: string };
type Extra = { id: string; nombre: string; precio_adicional: number; activo: boolean | null };
type Design = {
  id: string;
  sku: string | null;
  nombre: string;
  descripcion: string | null;
  categoria_id: string | null;
  producto_id: string | null;
  archivo_url: string | null;
  archivo_id: string | null;
  precio: number;
  activo: boolean;
  observaciones: string | null;
  extra_ids: string[];
};
type Launch = {
  id: string;
  nombre: string;
  descripcion: string | null;
  fecha_lanzamiento: string | null;
  precio: number | null;
  imagen_path: string | null;
  archivo_id: string | null;
  diseno_ids: string[];
  extra_ids: string[];
};
const inputClass =
  "w-full border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600";
const buttonClass =
  "inline-flex items-center gap-2 border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-500 disabled:opacity-50";
const money = (value: number | null | undefined) =>
  `Q ${Number(value ?? 0).toLocaleString("es-GT", { minimumFractionDigits: 2 })}`;
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title,
  onClose,
  children,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/30 p-4">
    <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto border border-gray-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <h2 className="font-semibold text-gray-950">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Cerrar
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block space-y-1.5">
    <span className="text-xs font-medium text-gray-600">{label}</span>
    {children}
  </label>
);

const DesignImage: React.FC<{ path: string | null }> = ({ path }) => {
  const [url, setUrl] = useState<string | null>(path?.startsWith("http") ? path : null);
  useEffect(() => {
    if (!path || path.startsWith("http")) return;
    let active = true;
    void getSignedR2Url(path)
      .then((next) => {
        if (active) setUrl(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [path]);
  return url ? (
    <img src={url} alt="Vista del diseño" className="h-12 w-16 object-cover" />
  ) : (
    <span className="text-xs text-gray-400">Sin imagen</span>
  );
};

export const AdminDesignsPage: React.FC = () => {
  const [items, setItems] = useState<Design[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Design | null>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [originalImageName, setOriginalImageName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageStats, setImageStats] = useState<{ original: number; optimized: number } | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [designs, productRows, costRows, categoryRows, extraRows, links] = await Promise.all([
      supabase.from("disenos").select("*").order("created_at", { ascending: false }),
      supabase.from("productos").select("id,sku,nombre,precio_base,precio_mayorista").eq("activo", true).order("nombre"),
      supabase.from("productos_costos").select("producto_id,costo_unitario"),
      supabase.from("categorias").select("id,nombre").order("nombre"),
      supabase.from("extras").select("*").order("nombre"),
      supabase.from("diseno_extras").select("diseno_id,extra_id"),
    ]);
    const failed = [designs, productRows, costRows, categoryRows, extraRows, links].find(
      (result) => result.error,
    );
    if (failed?.error)
      setError(friendlyAdminError(failed.error, "No se pudieron cargar los diseños."));
    else {
      const extraMap = new Map<string, string[]>();
      (links.data ?? []).forEach((link) =>
        extraMap.set(link.diseno_id, [...(extraMap.get(link.diseno_id) ?? []), link.extra_id]),
      );
      setItems(
        (designs.data ?? []).map((item) => ({
          ...item,
          extra_ids: extraMap.get(item.id) ?? [],
        })) as Design[],
      );
      const costs = new Map((costRows.data ?? []).map((item) => [item.producto_id, Number(item.costo_unitario)]));
      setProducts((productRows.data ?? []).map((item) => ({ ...item, costo_unitario: costs.get(item.id) ?? 0 })) as Product[]);
      setCategories((categoryRows.data ?? []) as Category[]);
      setExtras((extraRows.data ?? []) as Extra[]);
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const nombre = String(form.get("nombre") ?? "").trim();
    if (!nombre) {
      setError("El nombre del diseño es obligatorio.");
      setSaving(false);
      return;
    }
    try {
      let uploaded = editing?.archivo_id
        ? { archivoId: editing.archivo_id, path: editing.archivo_url }
        : { archivoId: undefined, path: null };
      if (file) uploaded = await uploadFileToR2Service({ folder: "disenos", file, originalName: originalImageName ?? undefined });
      const extraIds = form.getAll("extra_ids").map(String);
      await adminService.guardarDiseno({
        p_diseno_id: editing?.id,
        p_sku: String(form.get("sku") || "") || undefined,
        p_nombre: nombre,
        p_descripcion: String(form.get("descripcion") || "") || undefined,
        p_categoria_id: String(form.get("categoria_id") || "") || undefined,
        p_producto_id: String(form.get("producto_id") || "") || undefined,
        p_archivo_url: uploaded.path || undefined,
        p_archivo_id: uploaded.archivoId,
        p_precio: Number(form.get("precio") ?? 0),
        p_activo: form.get("activo") === "on",
        p_observaciones: String(form.get("observaciones") || "") || undefined,
        p_extra_ids: extraIds,
      });
      setOpen(false);
      setEditing(null);
      setFile(null);
      setOriginalImageName(null);
      setImageStats(null);
      setSuccess(editing ? "Diseño actualizado correctamente." : "Diseño creado correctamente.");
      await load();
    } catch (err) {
      setError(friendlyAdminError(err, "No se pudo guardar el diseño."));
    } finally {
      setSaving(false);
    }
  };
  const filtered = useMemo(
    () =>
      items.filter((item) =>
        `${item.sku ?? ""} ${item.nombre} ${item.descripcion ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase().trim()),
      ),
    [items, search],
  );
  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
            Catálogo / Diseños
          </p>
          <h1 className="text-2xl font-semibold text-gray-950">Diseños</h1>
          <p className="mt-2 text-sm text-gray-500">
            Metadatos, imagen R2 y extras asociados con campos reales.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            title="Actualizar"
            className="p-2 text-gray-500 disabled:opacity-50 hover:bg-gray-100"
          >
            <RefreshCw size={17} />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFile(null);
              setOriginalImageName(null);
              setImageStats(null);
              setSuccess(null);
              setOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-blue-700 px-3 py-2 text-sm font-medium text-white"
          >
            <Plus size={16} /> Agregar diseño
          </button>
        </div>
      </header>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por SKU, nombre o descripción"
          className={`${inputClass} pl-9`}
        />
      </div>
      {error && <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {success && (
        <p className="border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</p>
      )}
      {loading ? (
        <p className="border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          Cargando diseños...
        </p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 bg-white">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Imagen</th>
                <th className="px-4 py-3">SKU / Nombre</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">SKU / costo / precio</th>
                <th className="px-4 py-3">Base / final</th>
                <th className="px-4 py-3">Extras</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <DesignImage path={item.archivo_url} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{item.nombre}</p>
                    <p className="text-xs text-gray-500">{item.sku ?? "Sin SKU"}</p>
                  </td>
                  <td className="px-4 py-3">
                    {categories.find((category) => category.id === item.categoria_id)?.nombre ??
                      "—"}
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const product = products.find((candidate) => candidate.id === item.producto_id);
                      return product ? <><p className="font-medium">{product.sku} · {product.nombre}</p><p className="text-xs text-gray-500">Costo {money(product.costo_unitario)} · Venta {money(product.precio_base)}</p></> : <span className="text-gray-400">Sin SKU vinculado</span>;
                    })()}
                  </td>
                  <td className="px-4 py-3">{(() => { const extrasTotal = item.extra_ids.reduce((sum, extraId) => sum + Number(extras.find((extra) => extra.id === extraId)?.precio_adicional ?? 0), 0); return <><p>Base {money(item.precio)}</p><p className="text-xs text-gray-500">Final con extras {money(Number(item.precio) + extrasTotal)}</p></>; })()}</td>
                  <td className="px-4 py-3">{item.extra_ids.length}</td>
                  <td className="px-4 py-3">{item.activo ? "Activo" : "Inactivo"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      title="Editar diseño"
                      onClick={() => {
                        setEditing(item);
                        setFile(null);
                        setSuccess(null);
                        setOpen(true);
                      }}
                      className="p-2 text-gray-500 hover:text-blue-700"
                    >
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="p-10 text-center text-sm text-gray-500">No hay diseños para mostrar.</p>
          )}
        </div>
      )}
      {open && (
        <Modal
          title={editing ? "Editar diseño" : "Agregar diseño"}
          onClose={() => {
            if (!saving) {
              setOpen(false);
              setEditing(null);
              setFile(null);
            }
          }}
        >
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre *">
                <input
                  name="nombre"
                  required
                  defaultValue={editing?.nombre ?? ""}
                  className={inputClass}
                />
              </Field>
              <Field label="SKU">
                <input name="sku" defaultValue={editing?.sku ?? ""} className={inputClass} />
              </Field>
              <Field label="Categoría">
                <select
                  name="categoria_id"
                  defaultValue={editing?.categoria_id ?? ""}
                  className={inputClass}
                >
                  <option value="">Sin categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.nombre}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Producto vendible / SKU *">
                <select
                  required
                  name="producto_id"
                  defaultValue={editing?.producto_id ?? ""}
                  className={inputClass}
                >
                  <option value="">Selecciona el SKU vendible</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.sku} · {product.nombre}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Precio">
                <input
                  name="precio"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={editing?.precio ?? 0}
                  className={inputClass}
                />
              </Field>
              <Field label="Imagen">
                <label className={`${buttonClass} w-full cursor-pointer justify-center`}>
                  <Upload size={15} />
                  {file ? file.name : "Seleccionar imagen"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    onChange={(event) => {
                      const selected = event.target.files?.[0];
                      if (!selected) return;
                      setOptimizing(true);
                      setOriginalImageName(selected.name);
                      setImageStats(null);
                      void compressImageForR2(selected).then((optimized) => { setFile(optimized); setImageStats({ original: selected.size, optimized: optimized.size }); }).catch((err) => setError(err instanceof Error ? err.message : "No se pudo procesar la imagen.")).finally(() => setOptimizing(false));
                    }}
                    className="sr-only"
                  />
                </label>
                <span className="text-xs text-gray-500">{optimizing ? "Optimizando imagen..." : imageStats ? `Original: ${(imageStats.original / 1024).toFixed(0)} KB · Optimizada: ${(imageStats.optimized / 1024).toFixed(0)} KB · WebP` : "JPEG, PNG o WebP; se optimiza antes de subir."}</span>
              </Field>
            </div>
            <Field label="Descripción">
              <textarea
                name="descripcion"
                rows={2}
                defaultValue={editing?.descripcion ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Extras asociados">
              <select
                name="extra_ids"
                multiple
                defaultValue={editing?.extra_ids ?? []}
                className={`${inputClass} min-h-28`}
              >
                {extras
                  .filter((extra) => extra.activo)
                  .map((extra) => (
                    <option key={extra.id} value={extra.id}>
                      {extra.nombre} · {money(extra.precio_adicional)}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Observaciones">
              <textarea
                name="observaciones"
                rows={2}
                defaultValue={editing?.observaciones ?? ""}
                className={inputClass}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input name="activo" type="checkbox" defaultChecked={editing?.activo ?? true} />{" "}
              Activo
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setOpen(false)}
                className={buttonClass}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar diseño"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
};

export const AdminExtrasPage: React.FC = () => {
  const [items, setItems] = useState<Extra[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Extra | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const result = await supabase.from("extras").select("*").order("nombre");
    if (result.error)
      setError(friendlyAdminError(result.error, "No se pudieron cargar los extras."));
    else {
      setItems((result.data ?? []) as Extra[]);
      setError(null);
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const nombre = String(form.get("nombre") ?? "").trim();
    const precio = Number(form.get("precio_adicional") ?? 0);
    if (!nombre || precio < 0) {
      setError("Nombre y precio válido son obligatorios.");
      setSaving(false);
      return;
    }
    const result = editing
      ? await supabase
          .from("extras")
          .update({ nombre, precio_adicional: precio, activo: form.get("activo") === "on" })
          .eq("id", editing.id)
      : await supabase.from("extras").insert({ nombre, precio_adicional: precio, activo: true });
    if (result.error) setError(friendlyAdminError(result.error, "No se pudo guardar el extra."));
    else {
      setOpen(false);
      setEditing(null);
      setSuccess(editing ? "Extra actualizado correctamente." : "Extra creado correctamente.");
      await load();
    }
    setSaving(false);
  };
  const toggle = async (item: Extra) => {
    setError(null);
    const result = await supabase.from("extras").update({ activo: !item.activo }).eq("id", item.id);
    if (result.error)
      setError(friendlyAdminError(result.error, "No se pudo cambiar el estado del extra."));
    else {
      setSuccess(
        item.activo ? "Extra desactivado correctamente." : "Extra activado correctamente.",
      );
      await load();
    }
  };
  const filtered = items.filter((item) =>
    item.nombre.toLowerCase().includes(search.toLowerCase().trim()),
  );
  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
            Catálogo / Extras
          </p>
          <h1 className="text-2xl font-semibold text-gray-950">Extras</h1>
          <p className="mt-2 text-sm text-gray-500">
            Servicios adicionales con nombre, precio y estado real.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            title="Actualizar"
            className="p-2 text-gray-500 disabled:opacity-50"
          >
            <RefreshCw size={17} />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-blue-700 px-3 py-2 text-sm font-medium text-white"
          >
            <Plus size={16} /> Nuevo extra
          </button>
        </div>
      </header>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre"
          className={`${inputClass} pl-9`}
        />
      </div>
      {error && <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {success && (
        <p className="border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</p>
      )}
      {loading ? (
        <p className="border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          Cargando extras...
        </p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 bg-white">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium">{item.nombre}</td>
                  <td className="px-4 py-3">{money(item.precio_adicional)}</td>
                  <td className="px-4 py-3">{item.activo ? "Activo" : "Inactivo"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      title="Editar extra"
                      onClick={() => {
                        setEditing(item);
                        setOpen(true);
                      }}
                      className="p-2 text-gray-500"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      title={item.activo ? "Desactivar extra" : "Activar extra"}
                      onClick={() => void toggle(item)}
                      className="p-2 text-gray-500"
                    >
                      {item.activo ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && (
        <Modal
          title={editing ? "Editar extra" : "Nuevo extra"}
          onClose={() => {
            if (!saving) setOpen(false);
          }}
        >
          <form onSubmit={save} className="space-y-4">
            <Field label="Nombre *">
              <input
                name="nombre"
                required
                defaultValue={editing?.nombre ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Precio adicional *">
              <input
                name="precio_adicional"
                required
                min="0"
                step="0.01"
                type="number"
                defaultValue={editing?.precio_adicional ?? 0}
                className={inputClass}
              />
            </Field>
            {editing && (
              <label className="flex items-center gap-2 text-sm">
                <input name="activo" type="checkbox" defaultChecked={editing.activo ?? true} />{" "}
                Activo
              </label>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setOpen(false)}
                className={buttonClass}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar extra"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
};

export const AdminLaunchesPage: React.FC = () => {
  const [items, setItems] = useState<Launch[]>([]);
  const [designs, setDesigns] = useState<Array<{ id: string; nombre: string }>>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [editing, setEditing] = useState<Launch | null>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    const [launchRows, designRows, extraRows, designLinks, extraLinks] = await Promise.all([
      supabase.from("lanzamientos").select("*").order("fecha_lanzamiento", { ascending: false }),
      supabase.from("disenos").select("id,nombre").eq("activo", true).order("nombre"),
      supabase
        .from("extras")
        .select("id,nombre,precio_adicional,activo")
        .eq("activo", true)
        .order("nombre"),
      supabase.from("lanzamiento_disenos").select("lanzamiento_id,diseno_id"),
      supabase.from("lanzamiento_extras").select("lanzamiento_id,extra_id"),
    ]);
    const failed = [launchRows, designRows, extraRows, designLinks, extraLinks].find(
      (result) => result.error,
    );
    if (failed?.error)
      setError(friendlyAdminError(failed.error, "No se pudieron cargar los lanzamientos."));
    else {
      const dMap = new Map<string, string[]>();
      const eMap = new Map<string, string[]>();
      (designLinks.data ?? []).forEach((link) =>
        dMap.set(link.lanzamiento_id, [...(dMap.get(link.lanzamiento_id) ?? []), link.diseno_id]),
      );
      (extraLinks.data ?? []).forEach((link) =>
        eMap.set(link.lanzamiento_id, [...(eMap.get(link.lanzamiento_id) ?? []), link.extra_id]),
      );
      setItems(
        (launchRows.data ?? []).map((item) => ({
          ...item,
          diseno_ids: dMap.get(item.id) ?? [],
          extra_ids: eMap.get(item.id) ?? [],
        })) as Launch[],
      );
      setDesigns((designRows.data ?? []) as Array<{ id: string; nombre: string }>);
      setExtras((extraRows.data ?? []) as Extra[]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      let uploaded = editing?.archivo_id
        ? { archivoId: editing.archivo_id, path: editing.imagen_path }
        : { archivoId: undefined, path: null };
      if (file)
        uploaded = await uploadFileToR2Service({
          folder: "lanzamientos",
          file: await compressImageForR2(file),
        });
      await adminService.guardarLanzamiento({
        p_lanzamiento_id: editing?.id,
        p_nombre: String(form.get("nombre") ?? "").trim(),
        p_descripcion: String(form.get("descripcion") || "") || undefined,
        p_fecha_lanzamiento: String(form.get("fecha_lanzamiento") || "") || undefined,
        p_precio: form.get("precio") ? Number(form.get("precio")) : undefined,
        p_imagen_path: uploaded.path || undefined,
        p_archivo_id: uploaded.archivoId,
        p_diseno_ids: form.getAll("diseno_ids").map(String),
        p_extra_ids: form.getAll("extra_ids").map(String),
      });
      setOpen(false);
      setEditing(null);
      setFile(null);
      setSuccess("Lanzamiento guardado correctamente.");
      await load();
    } catch (err) {
      setError(friendlyAdminError(err, "No se pudo guardar el lanzamiento."));
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="space-y-5">
      <header className="flex items-end justify-between border-b border-gray-200 pb-5">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
            Catálogo / Lanzamientos
          </p>
          <h1 className="text-2xl font-semibold">Lanzamientos</h1>
          <p className="mt-2 text-sm text-gray-500">
            Publicaciones opcionales por fecha, diseño y extras; sin estados adicionales.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setFile(null);
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-blue-700 px-3 py-2 text-sm font-medium text-white"
        >
          <Plus size={16} /> Nuevo lanzamiento
        </button>
      </header>
      {error && <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {success && (
        <p className="border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</p>
      )}
      <div className="overflow-x-auto border border-gray-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Diseños</th>
              <th className="px-4 py-3">Extras</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-medium">{item.nombre}</td>
                <td className="px-4 py-3">{item.fecha_lanzamiento ?? "—"}</td>
                <td className="px-4 py-3">{item.precio == null ? "—" : money(item.precio)}</td>
                <td className="px-4 py-3">{item.diseno_ids.length}</td>
                <td className="px-4 py-3">{item.extra_ids.length}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    title="Editar lanzamiento"
                    onClick={() => {
                      setEditing(item);
                      setFile(null);
                      setOpen(true);
                    }}
                    className="p-2 text-gray-500"
                  >
                    <Pencil size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="p-10 text-center text-sm text-gray-500">No hay lanzamientos registrados.</p>
        )}
      </div>
      {open && (
        <Modal
          title={editing ? "Editar lanzamiento" : "Nuevo lanzamiento"}
          onClose={() => {
            if (!saving) setOpen(false);
          }}
        >
          <form onSubmit={save} className="space-y-4">
            <Field label="Nombre *">
              <input
                name="nombre"
                required
                defaultValue={editing?.nombre ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Descripción">
              <textarea
                name="descripcion"
                rows={2}
                defaultValue={editing?.descripcion ?? ""}
                className={inputClass}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Fecha">
                <input
                  name="fecha_lanzamiento"
                  type="date"
                  defaultValue={editing?.fecha_lanzamiento ?? ""}
                  className={inputClass}
                />
              </Field>
              <Field label="Precio">
                <input
                  name="precio"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={editing?.precio ?? ""}
                  className={inputClass}
                />
              </Field>
              <Field label="Imagen">
                <label className={`${buttonClass} w-full cursor-pointer justify-center`}>
                  <Upload size={15} />
                  {file ? file.name : "Seleccionar"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                </label>
              </Field>
            </div>
            <Field label="Diseños asociados">
              <select
                name="diseno_ids"
                multiple
                defaultValue={editing?.diseno_ids ?? []}
                className={`${inputClass} min-h-28`}
              >
                {designs.map((design) => (
                  <option key={design.id} value={design.id}>
                    {design.nombre}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Extras asociados">
              <select
                name="extra_ids"
                multiple
                defaultValue={editing?.extra_ids ?? []}
                className={`${inputClass} min-h-24`}
              >
                {extras.map((extra) => (
                  <option key={extra.id} value={extra.id}>
                    {extra.nombre}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setOpen(false)}
                className={buttonClass}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar lanzamiento"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
};
