import React, { useState } from "react";
import { Printer } from "lucide-react";
import { printDocument, type PrintDocumentKind, type PrintWidth } from "./printDocuments";

export const PrintDocumentButton: React.FC<{ kind: PrintDocumentKind; documentId: string }> = ({ kind, documentId }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<PrintWidth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const choose = async (width: PrintWidth) => {
    setBusy(width);
    setError(null);
    const target = window.open("", "_blank");
    try {
      await printDocument(kind, documentId, width, target);
      setOpen(false);
    } catch {
      setError("No se pudo preparar el documento para impresion.");
    } finally {
      setBusy(null);
    }
  };
  return <div className="relative inline-flex items-center gap-1">
    <button type="button" title="Imprimir documento" onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900"><Printer size={14} /> Imprimir</button>
      {open && <div className="absolute right-0 top-7 z-20 w-44 border border-gray-200 bg-white p-2 text-xs shadow-lg">
      <p className="mb-2 font-medium text-gray-700">Formato de salida</p>
      {(["58mm", "80mm", "pdf"] as PrintWidth[]).map((width) => <button key={width} type="button" disabled={busy !== null} onClick={() => void choose(width)} className="block w-full px-2 py-1.5 text-left hover:bg-gray-50 disabled:opacity-50">{busy === width ? "Preparando..." : width === "pdf" ? "PDF / A4" : width}</button>)}
      {error && <p className="mt-2 text-red-700">{error}</p>}
    </div>}
  </div>;
};
