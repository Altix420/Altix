import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { S3Client, PutObjectCommand, GetObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.1145.0';
import { getSignedUrl } from 'https://esm.sh/@aws-sdk/s3-request-presigner@3.1145.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const allowedFolders = new Set(['disenos', 'productos', 'lanzamientos', 'exports', 'auditoria', 'backups']);
const allowedMimeTypes = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/csv'
]);

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, 'Content-Type': 'application/json' }
});

const validPath = (value: unknown): value is string =>
  typeof value === 'string'
  && /^(disenos|productos|lanzamientos|exports|auditoria|backups)\/[A-Za-z0-9][A-Za-z0-9/_ .-]*$/.test(value)
  && !value.includes('..');

const createR2Client = () => {
  const accountId = Deno.env.get('R2_ACCOUNT_ID');
  const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    // R2 receives the browser's later PUT, so the presigned request must not
    // contain an SDK-generated checksum for a body that is not present yet.
    requestChecksumCalculation: 'WHEN_REQUIRED'
  });
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const auth = request.headers.get('Authorization');
  if (!auth) return json({ error: 'No autorizado.' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'No autorizado.' }, 401);

  let payload: { path?: unknown; method?: unknown; contentType?: unknown; sizeBytes?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Solicitud invalida.' }, 400);
  }

  const { path, method, contentType, sizeBytes } = payload;
  const folder = typeof path === 'string' ? path.split('/')[0] : '';
  if (!validPath(path) || !allowedFolders.has(folder)) {
    return json({ error: 'Path no autorizado.' }, 400);
  }
  if (method !== 'PUT' && method !== 'GET') {
    return json({ error: 'Metodo invalido.' }, 400);
  }
  if (method === 'PUT') {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'administrador') {
      return json({ error: 'Solo un administrador puede cargar archivos.' }, 403);
    }
    if (typeof contentType !== 'string' || !allowedMimeTypes.has(contentType) || !Number.isInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > 10 * 1024 * 1024) {
      return json({ error: 'Archivo no permitido.' }, 400);
    }
  }

  const r2 = createR2Client();
  if (!r2) return json({ error: 'R2 no esta configurado en el runtime Edge.' }, 503);

  const bucket = Deno.env.get('R2_BUCKET') ?? 'altix-dev';
  if (bucket !== 'altix-dev' && bucket !== 'altix-prod') return json({ error: 'Bucket R2 no autorizado.' }, 503);
  const command = method === 'PUT'
    ? new PutObjectCommand({ Bucket: bucket, Key: path, ContentType: contentType as string })
    : new GetObjectCommand({ Bucket: bucket, Key: path });
  try {
    const url = await getSignedUrl(r2, command, { expiresIn: 300 });
    return json({ url, path, method, bucket });
  } catch {
    return json({ error: 'No se pudo generar la URL firmada.' }, 502);
  }
});
