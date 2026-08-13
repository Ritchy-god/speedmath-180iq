const encoder = new TextEncoder();
const DEFAULT_LIMIT = 2000;

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

export class MyScriptUsage {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async getUsage() {
    const limit = Math.max(1, Number(this.env.MYSCRIPT_REQUEST_LIMIT) || DEFAULT_LIMIT);
    let used = await this.state.storage.get('used');
    if (!Number.isFinite(used)) {
      used = Math.max(0, Number(this.env.MYSCRIPT_USAGE_OFFSET) || 0);
      await this.state.storage.put('used', Math.min(used, limit));
    }
    used = Math.min(Math.max(0, used), limit);
    return { used, limit, remaining: Math.max(0, limit - used), limitReached: used >= limit };
  }

  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === '/reserve' && request.method === 'POST') {
      const usage = await this.getUsage();
      if (usage.limitReached) return json({ allowed: false, usage }, 429);
      await this.state.storage.put('used', usage.used + 1);
      return json({ allowed: true, usage: { ...usage, used: usage.used + 1, remaining: usage.remaining - 1, limitReached: usage.used + 1 >= usage.limit } });
    }
    if (path === '/exhaust' && request.method === 'POST') {
      const usage = await this.getUsage();
      await this.state.storage.put('used', usage.limit);
      return json({ usage: { ...usage, used: usage.limit, remaining: 0, limitReached: true } });
    }
    return json({ usage: await this.getUsage() });
  }
}

function usageStub(env) {
  if (!env.MYSCRIPT_USAGE) throw new Error('Usage counter is not configured');
  return env.MYSCRIPT_USAGE.get(env.MYSCRIPT_USAGE.idFromName('global'));
}

async function getUsage(env) {
  const response = await usageStub(env).fetch('https://usage.internal/status');
  return (await response.json()).usage;
}

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://ritchy-god.github.io';
    const origin = request.headers.get('Origin') || '';
    if (origin !== allowedOrigin) return json({ error: 'Origin not allowed' }, 403);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin'
      }});
    }
    const path = new URL(request.url).pathname;
    if (request.method === 'GET' && path === '/usage') {
      try {
        return json({ usage: await getUsage(env) }, 200, allowedOrigin);
      } catch (error) {
        return json({ error: error.message || 'Usage unavailable' }, 503, allowedOrigin);
      }
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
      const reservationResponse = await usageStub(env).fetch('https://usage.internal/reserve', { method: 'POST' });
      const reservation = await reservationResponse.json();
      if (!reservation.allowed) {
        return json({
          error: 'ครบโควตา MyScript 2,000 ครั้งแล้ว',
          code: 'MYSCRIPT_LIMIT_REACHED',
          usage: reservation.usage
        }, 429, allowedOrigin);
      }
      let usage = reservation.usage;
      // The v4 recognizer accepts strokes directly at the top level. Coordinates
      // come from a CSS-pixel canvas, so convert one pixel to millimetres at 96 DPI.
      const millimetresPerPixel = 25.4 / 96;
      const payload = JSON.stringify({
        scaleX: millimetresPerPixel,
        scaleY: millimetresPerPixel,
        contentType: 'Math',
        configuration: {
          lang: 'en_US'
        },
        strokes: input.strokes.map(({ id, x, y }) => ({ id, x, y }))
      });
      const signature = await hmacHex(payload, env.MYSCRIPT_APPLICATION_KEY, env.MYSCRIPT_HMAC_KEY);
      const upstream = await fetch(env.MYSCRIPT_URL || 'https://cloud.myscript.com/api/v4.0/iink/recognize', {
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
      if (!upstream.ok) {
        const quotaRejected = [402, 403, 429].includes(upstream.status) && /quota|limit|request/i.test(latex);
        if (quotaRejected) {
          const exhausted = await usageStub(env).fetch('https://usage.internal/exhaust', { method: 'POST' });
          usage = (await exhausted.json()).usage;
        }
        return json({
          error: quotaRejected ? 'ครบโควตา MyScript 2,000 ครั้งแล้ว' : `MyScript rejected the request (${upstream.status})`,
          code: quotaRejected ? 'MYSCRIPT_LIMIT_REACHED' : 'MYSCRIPT_REJECTED',
          usage
        }, quotaRejected ? 429 : 502, allowedOrigin);
      }
      return json({ latex, usage }, 200, allowedOrigin);
    } catch (error) {
      return json({ error: error.message || 'Recognition failed' }, 400, allowedOrigin);
    }
  }
};
