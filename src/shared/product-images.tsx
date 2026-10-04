/* eslint-disable react/set-state-in-effect */
import React, { useEffect, useState } from "react";
import { getSignedR2Url } from "../storage/r2.service";

type ImageRecord = { path?: string | null; archivo_url?: string | null };
export type ProductImageSource = ImageRecord & {
  archivos?: ImageRecord | ImageRecord[] | null;
  disenos?: Array<ImageRecord & { archivos?: ImageRecord | ImageRecord[] | null }> | null;
};

const pathFromRecord = (record?: ImageRecord | null) => {
  if (!record) return null;
  return record.path || record.archivo_url || null;
};

const pathFromFiles = (files?: ImageRecord | ImageRecord[] | null) =>
  Array.isArray(files) ? pathFromRecord(files[0]) : pathFromRecord(files);

const resolveProductImagePath = (product?: ProductImageSource | null) => {
  if (!product) return null;
  return pathFromRecord(product) || pathFromFiles(product.archivos) ||
    product.disenos?.map((design) => pathFromRecord(design) || pathFromFiles(design.archivos)).find(Boolean) || null;
};

export const ProductImage: React.FC<{
  product?: ProductImageSource | null;
  alt?: string;
  className?: string;
}> = ({ product, alt = "Producto", className = "h-16 w-16" }) => {
  const path = resolveProductImagePath(product);
  const [url, setUrl] = useState<string | null>(path?.startsWith("http") ? path : null);

  useEffect(() => {
    let active = true;
    setUrl(path?.startsWith("http") ? path : null);
    if (!path || path.startsWith("http")) return () => { active = false; };
    void getSignedR2Url(path).then((next) => {
      if (active) setUrl(next);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [path]);

  return url ? (
    <img src={url} alt={alt} loading="lazy" className={`${className} object-cover`} />
  ) : (
    <span className={`${className} inline-flex shrink-0 items-center justify-center bg-gray-100 text-[10px] font-semibold uppercase tracking-wide text-gray-400`} aria-label={`${alt} sin imagen`}>
      ALTIX
    </span>
  );
};
