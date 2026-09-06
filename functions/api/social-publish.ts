import { verifyAdminRequest } from '../../shared/adminAuth';

export async function onRequest(context: { request: Request; env: Record<string, any> }) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  // Authenticate request
  const auth = verifyAdminRequest(env, request);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { message, mediaUrl, platform, pageId, igAccountId, token } = body;

    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing access token' }), { status: 400 });
    }

    if (platform === 'facebook') {
      if (!pageId) return new Response(JSON.stringify({ error: 'Missing Page ID' }), { status: 400 });

      // Post to Facebook Page
      const fbUrl = new URL(`https://graph.facebook.com/v19.0/${pageId}/photos`);
      fbUrl.searchParams.append('access_token', token);
      fbUrl.searchParams.append('message', message);
      if (mediaUrl) {
        fbUrl.searchParams.append('url', mediaUrl);
      } else {
        // If no media, change endpoint to /feed
        fbUrl.pathname = `/v19.0/${pageId}/feed`;
      }

      const fbRes = await fetch(fbUrl.toString(), { method: 'POST' });
      const fbData = await fbRes.json();
      
      if (!fbRes.ok) {
        throw new Error(`Facebook API Error: ${JSON.stringify(fbData)}`);
      }

      return new Response(JSON.stringify({ success: true, id: fbData.id }), { status: 200 });
      
    } else if (platform === 'instagram') {
      if (!igAccountId) return new Response(JSON.stringify({ error: 'Missing IG Account ID' }), { status: 400 });
      if (!mediaUrl) return new Response(JSON.stringify({ error: 'Instagram requires mediaUrl (image)' }), { status: 400 });

      // Instagram Graph API is a two-step process for publishing
      // Step 1: Create media container
      const createUrl = new URL(`https://graph.facebook.com/v19.0/${igAccountId}/media`);
      createUrl.searchParams.append('access_token', token);
      createUrl.searchParams.append('image_url', mediaUrl);
      createUrl.searchParams.append('caption', message);

      const createRes = await fetch(createUrl.toString(), { method: 'POST' });
      const createData = await createRes.json();

      if (!createRes.ok || !createData.id) {
        throw new Error(`IG Create Media Error: ${JSON.stringify(createData)}`);
      }

      const creationId = createData.id;

      // Step 2: Publish media container
      const publishUrl = new URL(`https://graph.facebook.com/v19.0/${igAccountId}/media_publish`);
      publishUrl.searchParams.append('access_token', token);
      publishUrl.searchParams.append('creation_id', creationId);

      const publishRes = await fetch(publishUrl.toString(), { method: 'POST' });
      const publishData = await publishRes.json();

      if (!publishRes.ok) {
        throw new Error(`IG Publish Error: ${JSON.stringify(publishData)}`);
      }

      return new Response(JSON.stringify({ success: true, id: publishData.id }), { status: 200 });

    } else {
      return new Response(JSON.stringify({ error: 'Invalid platform' }), { status: 400 });
    }

  } catch (error: any) {
    console.error('Social Publish Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
