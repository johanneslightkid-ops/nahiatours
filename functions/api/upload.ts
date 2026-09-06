import { verifyAdminRequest } from '../../shared/adminAuth';

/**
 * Cloudflare Function that proxies image uploads to Cloudinary.
 * Uses the server-side API key and secret set in the Cloudflare Pages
 * environment variables (not exposed to the browser).
 */
export async function onRequest(context: { request: Request; env: Record<string, any> }) {
  const { request, env } = context;

  // Only accept POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Authenticate via admin password header (same as data API)
  const auth = verifyAdminRequest(env, request);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Read Cloudinary credentials from environment
  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return new Response(
      JSON.stringify({ error: 'Cloudinary credentials not configured on server' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Read the multipart form data from the request
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'Missing file in upload' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build a signature for Cloudinary signed upload
    // We use the API key and secret to sign the upload request
    const folder = formData.get('folder')?.toString() || 'brand-icons';
    const timestamp = Math.round(Date.now() / 1000);

    // Build params for signing
    const paramsToSign = new URLSearchParams();
    paramsToSign.set('folder', folder);
    paramsToSign.set('timestamp', String(timestamp));

    // Create the signature string: sort params alphabetically, join with &, append api_secret
    const sortedKeys = Array.from(paramsToSign.keys()).sort();
    const signatureString = sortedKeys
      .map((k) => `${k}=${paramsToSign.get(k)}`)
      .join('&') + apiSecret;

    // Encode as SHA-1 hex digest
    const encoder = new TextEncoder();
    const signatureBuffer = await crypto.subtle.digest(
      'SHA-1',
      encoder.encode(signatureString)
    );
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Build the upload form data for Cloudinary
    const cloudinaryForm = new FormData();
    cloudinaryForm.set('file', file);
    cloudinaryForm.set('folder', folder);
    cloudinaryForm.set('timestamp', String(timestamp));
    cloudinaryForm.set('api_key', apiKey);
    cloudinaryForm.set('signature', signature);

    // Upload to Cloudinary
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: cloudinaryForm,
    });

    const result = await uploadResponse.json();

    if (!uploadResponse.ok) {
      console.error('[Cloudflare Function] Cloudinary upload failed:', result);
      return new Response(
        JSON.stringify({ error: 'Cloudinary upload failed', details: result }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!result.secure_url) {
      return new Response(
        JSON.stringify({ error: 'Cloudinary returned no URL' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ secure_url: result.secure_url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[Cloudflare Function] Upload error:', error);
    return new Response(
      JSON.stringify({ error: error?.message ?? 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}