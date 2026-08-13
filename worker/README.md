# MyScript fallback proxy

This Worker keeps the MyScript application and HMAC keys off the public GitHub Pages site.

## Deploy

1. Authenticate locally:

   ```powershell
   npx wrangler login
   ```

2. Enter each value at the hidden prompt. Never add either value to a tracked file:

   ```powershell
   npx wrangler secret put MYSCRIPT_APPLICATION_KEY
   npx wrangler secret put MYSCRIPT_HMAC_KEY
   ```

3. Deploy:

   ```powershell
   npx wrangler deploy
   ```

4. Copy the resulting `workers.dev` URL into `window.SPEEDMATH_MYSCRIPT_PROXY_URL` in `app.js`, or load a local `myscript-config.js` before `app.js`.

The browser sends only pen coordinates to the Worker. The Worker signs the exact JSON body with HMAC-SHA512 and forwards it to MyScript's `/api/v4.0/iink/recognize` endpoint.

The Worker also stores one global, atomic usage counter in a Durable Object. `GET /usage`
returns used and remaining requests. Set `MYSCRIPT_USAGE_OFFSET` in `wrangler.toml`
to the current value shown in the MyScript Cloud counters before the first deployment
if the application key has already been used. The proxy stops forwarding requests at 2,000.
When the offset is left at zero, the website labels the value as tracked from the date
this counter was enabled rather than claiming it is the historical MyScript account total.
