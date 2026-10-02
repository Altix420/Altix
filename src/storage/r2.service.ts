import { supabase } from '../shared/supabase';

export type R2UploadStage = 'compression' | 'signed-url' | 'upload' | 'metadata';

export class R2UploadError extends Error {
  constructor(
    public readonly stage: R2UploadStage,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'R2UploadError';
  }
}

export interface UploadR2Params {
  folder: 'disenos' | 'lanzamientos' | 'exports' | 'auditoria' | 'backups';
  file: File;
  originalName?: string;
}

export const compressImageForR2 = async (file: File, maxBytes = 300_000): Promise<File> => {
  console.info('[ALTIX R2] compression:start', { originalType: file.type, originalSize: file.size });
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new R2UploadError('compression', 'Selecciona una imagen JPEG, PNG o WebP.');
  }
  if (file.type === 'image/webp' && file.size <= maxBytes) {
    console.info('[ALTIX R2] compression:success', { originalType: file.type, originalSize: file.size, finalType: file.type, finalSize: file.size });
    return file;
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    console.warn('[ALTIX R2] compression:failed', { originalType: file.type, originalSize: file.size, reason: 'bitmap_decode' });
    throw new R2UploadError('compression', 'No se pudo procesar la imagen seleccionada.');
  }
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
      if (!context) throw new R2UploadError('compression', 'No se pudo preparar la imagen.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.85, 0.78, 0.7, 0.62, 0.54, 0.46]) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
        if (!blob) continue;
        if (!smallest || blob.size < smallest.size) smallest = blob;
        if (blob.size <= maxBytes) {
          console.info('[ALTIX R2] compression:success', { originalType: file.type, originalSize: file.size, finalType: 'image/webp', finalSize: blob.size });
          return new File([blob], `${crypto.randomUUID()}.webp`, { type: 'image/webp' });
        }
      }
    }
  } finally {
    bitmap.close();
  }
  console.warn('[ALTIX R2] compression:failed', { originalType: file.type, originalSize: file.size, smallestSize: smallest?.size ?? null, reason: 'max_bytes' });
  throw new R2UploadError('compression', smallest ? 'La imagen es demasiado compleja para optimizarla sin perder calidad.' : 'No se pudo procesar la imagen.');
};

const readFunctionError = async (error: unknown) => {
  const context = error && typeof error === 'object' && 'context' in error ? (error as { context?: unknown }).context : undefined;
  if (context && typeof context === 'object' && 'clone' in context && typeof (context as Response).clone === 'function') {
    const response = context as Response;
    let detail = '';
    try {
      detail = (await response.clone().text()).slice(0, 240);
    } catch {
      detail = '';
    }
    return { status: response.status, detail };
  }
  return { status: undefined, detail: error instanceof Error ? error.message.slice(0, 240) : '' };
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

  // 1. La Edge Function es la única fuente del bucket y la firma.
  let presignedData: unknown;
  let presignedErr: unknown;
  try {
    const result = await supabase.functions.invoke('r2-presigned-url', {
      body: { path, method: 'PUT', contentType: file.type, sizeBytes: file.size }
    });
    presignedData = result.data;
    presignedErr = result.error;
  } catch (error) {
    const diagnostic = await readFunctionError(error);
    console.warn('[ALTIX R2] signed-url:failed', { path, contentType: file.type, sizeBytes: file.size, ...diagnostic });
    throw new R2UploadError('signed-url', 'No se pudo preparar la carga de la imagen.', diagnostic.status);
  }

  const signed = presignedData as { url?: unknown; bucket?: unknown } | null;
  const bucket = signed?.bucket === 'altix-prod' || signed?.bucket === 'altix-dev' ? signed.bucket : null;
  if (presignedErr || typeof signed?.url !== 'string' || !bucket) {
    const diagnostic = await readFunctionError(presignedErr);
    console.warn('[ALTIX R2] signed-url:failed', { path, contentType: file.type, sizeBytes: file.size, ...diagnostic });
    throw new R2UploadError('signed-url', 'No se pudo preparar la carga de la imagen.', diagnostic.status);
  }
  console.info('[ALTIX R2] signed-url:success', { path, contentType: file.type, sizeBytes: file.size, bucket });

  // 2. Cargar directamente el binario a Cloudflare R2
  let uploadRes: Response;
  try {
    uploadRes = await fetch(signed.url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file
    });
  } catch {
    console.warn('[ALTIX R2] upload:failed', { path, contentType: file.type, sizeBytes: file.size, reason: 'network_or_cors' });
    throw new R2UploadError('upload', 'No se pudo subir la imagen a R2. Verifica CORS y la conexión.', undefined);
  }

  if (!uploadRes.ok) {
    const responseBody = (await uploadRes.clone().text().catch(() => '')).slice(0, 240);
    console.warn('[ALTIX R2] upload:failed', { path, contentType: file.type, sizeBytes: file.size, status: uploadRes.status, responseBody });
    throw new R2UploadError('upload', `R2 no pudo recibir la imagen (${uploadRes.status}).`, uploadRes.status);
  }
  console.info('[ALTIX R2] upload:success', { path, contentType: file.type, sizeBytes: file.size, status: uploadRes.status });

  // 3. Registrar los metadatos mediante la RPC registrar_archivo
  const { data: archivoId, error: dbErr } = await supabase.rpc('registrar_archivo', {
    p_path: path,
    p_nombre_original: originalName ?? file.name,
    p_mime_type: file.type,
    p_size_bytes: file.size,
    p_bucket: bucket
  });

  if (dbErr) {
    console.warn('[ALTIX R2] metadata:failed', { path, bucket, code: dbErr.code, message: dbErr.message.slice(0, 240) });
    throw new R2UploadError('metadata', 'La imagen se subió, pero no se pudieron registrar sus metadatos.');
  }
  console.info('[ALTIX R2] metadata:success', { path, bucket, archivoId });

  return { path, archivoId };
};

export const getSignedR2Url = async (path: string) => {
  const { data, error } = await supabase.functions.invoke('r2-presigned-url', { body: { path, method: 'GET' } });
  if (error || !data?.url) throw new Error(error?.message ?? 'No se pudo obtener la imagen.');
  return data.url as string;
};
