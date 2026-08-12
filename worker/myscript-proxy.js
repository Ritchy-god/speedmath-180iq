const encoder = new TextEncoder();

function json(body, status = 200, origin = '') {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Vary': 'Origin'
  };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(JSON.stringify(body), { status, headers });
}

function validateInput(value) {
  if (!value || typeof value !== 'object') throw new Error('Invalid request');
  const width = Number(value.width);
  const height = Number(value.height);
  if (!(width > 0 && width <= 4096 && height > 0 && height <= 4096)) throw new Error('Invalid canvas size');
  if (!Array.isArray(value.strokes) || !value.strokes.length || value.strokes.length > 500) throw new Error('Invalid strokes');
  let totalPoints = 0;
  const strokes = value.strokes.map((stroke, index) => {
    if (!Array.isArray(stroke.x) || !Array.isArray(stroke.y) || stroke.x.length !== stroke.y.length || stroke.x.length < 2) {
      throw new Error('Invalid stroke coordinates');
    }
    totalPoints += stroke.x.length;
    if (totalPoints > 50000) throw new Error('Too many points');
    const x = stroke.x.map(Number);
    const y = stroke.y.map(Number);
    if (![...x, ...y].every(Number.isFinite)) throw new Error('Invalid point');
    return { id: `stroke-${index + 1}`, pointerType: 'PEN', x, y };
  });
  return { width, height, strokes };
}

async function hmacHex(message, applicationKey, hmacKey) {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(applicationKey + hmacKey),
    { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return [...new Uint8Array(signature)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://ritchy-god.github.io';
    const origin = request.headers.get('Origin') || '';
    if (origin !== allowedOrigin) return json({ error: 'Origin not allowed' }, 403);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin'
      }});
    }
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, allowedOrigin);
    const contentType = request.headers.get('Content-Type') || '';
    const contentLength = Number(request.headers.get('Content-Length') || 0);
    if (!contentType.toLowerCase().startsWith('application/json')) {
      return json({ error: 'Content-Type must be application/json' }, 415, allowedOrigin);
    }
    if (contentLength > 1024 * 1024) return json({ error: 'Request is too large' }, 413, allowedOrigin);
    if (!env.MYSCRIPT_APPLICATION_KEY || !env.MYSCRIPT_HMAC_KEY) {
      return json({ error: 'MyScript secrets are not configured' }, 503, allowedOrigin);
    }
    try {
      const input = validateInput(await request.json());
      const payload = JSON.stringify({
        configuration: {
          lang: 'en_US',
          math: {
            mimeTypes: ['application/x-latex'],
            solver: { enable: false }
          }
        },
        xDPI: 96,
        yDPI: 96,
        contentType: 'Math',
        width: input.width,
        height: input.height,
        strokeGroups: [{ penStyle: 'color: #000000; -myscript-pen-width: 1', strokes: input.strokes }]
      });
      const signature = await hmacHex(payload, env.MYSCRIPT_APPLICATION_KEY, env.MYSCRIPT_HMAC_KEY);
      const upstream = await fetch(env.MYSCRIPT_URL || 'https://cloud.myscript.com/api/v4.0/iink/recognize/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/x-latex,application/json',
          'applicationKey': env.MYSCRIPT_APPLICATION_KEY,
          'hmac': signature
        },
        body: payload
      });
      const latex = await upstream.text();
      if (!upstream.ok) return json({ error: `MyScript rejected the request (${upstream.status})` }, 502, allowedOrigin);
      return json({ latex }, 200, allowedOrigin);
    } catch (error) {
      return json({ error: error.message || 'Recognition failed' }, 400, allowedOrigin);
    }
  }
};
