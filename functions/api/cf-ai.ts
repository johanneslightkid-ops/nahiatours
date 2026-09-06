import { verifyAdminRequest } from '../../shared/adminAuth';

export async function onRequest(context: { request: Request; env: Record<string, any> }) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  // Optional: Add admin auth guard if desired.
  // We'll trust the token passed in for the proxy for now, 
  // but it's best to verify admin password since it's an admin-only feature.
  const auth = verifyAdminRequest(env, request);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { accountId, token, model, payload } = body;

    if (!accountId || !token || !model) {
      return new Response(JSON.stringify({ error: 'Missing required CF parameters' }), { status: 400 });
    }

    const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
    const cfRes = await fetch(cfUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const cfText = await cfRes.text();
    let cfData;
    try {
      cfData = JSON.parse(cfText);
    } catch {
      cfData = { response: cfText };
    }
    
    if (!cfRes.ok) {
      return new Response(JSON.stringify({ error: 'Cloudflare AI Error', details: cfData }), { 
        status: cfRes.status, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify(cfData), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error('CF Proxy Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
