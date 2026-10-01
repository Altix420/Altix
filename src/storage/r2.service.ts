import { supabase } from '../shared/supabase';

export interface UploadR2Params {
  folder: 'disenos' | 'lanzamientos' | 'exports' | 'auditoria' | 'backups';
  file: File;
  originalName?: string;
}

export const compressImageForR2 = async (file: File, maxBytes = 300_000): Promise<File> => {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Selecciona una imagen JPEG, PNG o WebP.');
  }
  if (file.type === 'image/webp' && file.size <= maxBytes) return file;
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const longestEdge = Math.max(bitmap.width, bitmap.height);
  const maxSides = [1600, 1400, 1200, 1000, 800, 640];
  let smallest: Blob | null = null;
  try {
    for (const maxSide of maxSides) {
      const scale = Math.min(1, maxSide / longestEdge);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No se pudo preparar la imagen.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.85, 0.78, 0.7, 0.62, 0.54, 0.46]) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
        if (!blob) continue;
        if (!smallest || blob.size < smallest.size) smallest = blob;
        if (blob.size <= maxBytes) return new File([blob], `${crypto.randomUUID()}.webp`, { type: 'image/webp' });
      }
    }
  } finally {
    bitmap.close();
  }
  throw new Error(smallest ? 'La imagen es demasiado compleja para optimizarla sin perder calidad.' : 'No se pudo procesar la imagen.');
};

export const uploadFileToR2Service = async ({ folder, file, originalName }: UploadR2Params) => {
  if (!file.size || file.size > 10 * 1024 * 1024) {
    throw new Error('El archivo debe pesar más de 0 y como máximo 10 MB.');
  }

  const allowedMimeTypes = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/csv'
  ]);
  if (!allowedMimeTypes.has(file.type)) {
    throw new Error(`Tipo de archivo no permitido: ${file.type || 'desconocido'}.`);
  }

  const fileExt = file.type === 'image/webp' ? 'webp' : file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const path = `${folder}/${fileName}`;

  // 1. Invocar la Edge Function con el contrato { path, method: 'PUT' }
  const { data: presignedData, error: presignedErr } = await supabase.functions.invoke('r2-presigned-url', {
    body: { path, method: 'PUT', contentType: file.type, sizeBytes: file.size }
  });

  if (presignedErr || !presignedData?.url) {
    throw new Error('R2 no está configurado o no está disponible en este entorno. La imagen no se guardó.');
  }

  // 2. Cargar directamente el binario a Cloudflare R2
  const uploadRes = await fetch(presignedData.url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file
  });

  if (!uploadRes.ok) {
    throw new Error(`R2 no pudo recibir la imagen (${uploadRes.status}). La imagen no se guardó.`);
  }

  // 3. Registrar los metadatos mediante la RPC registrar_archivo
  const { data: archivoId, error: dbErr } = await supabase.rpc('registrar_archivo', {
    p_path: path,
    p_nombre_original: originalName ?? file.name,
    p_mime_type: file.type,
    p_size_bytes: file.size,
    p_bucket: import.meta.env.VITE_R2_BUCKET === 'altix-prod' ? 'altix-prod' : 'altix-dev'
  });

  if (dbErr) throw new Error(`No se pudieron registrar los metadatos del archivo: ${dbErr.message}`);

  return { path, archivoId };
};

export const getSignedR2Url = async (path: string) => {
  const { data, error } = await supabase.functions.invoke('r2-presigned-url', { body: { path, method: 'GET' } });
  if (error || !data?.url) throw new Error(error?.message ?? 'No se pudo obtener la imagen.');
  return data.url as string;
};
