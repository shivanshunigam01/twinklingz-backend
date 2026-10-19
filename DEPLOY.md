# Deploy Twinklingz API (`api.twinklingz.com`)

The storefront calls `VITE_API_URL` (production: `https://api.twinklingz.com/api`). That host **must** run this **twinklingz-backend** repo—not another Node API.

## Verify what is live

```bash
curl -s https://api.twinklingz.com/
curl -s https://api.twinklingz.com/api/health
```

**Correct (Twinklingz):**

```json
{"ok":true,"service":"twinklingz-api"}
```

**Wrong (example):** `"service":"Patliputra Showroom API"` or `404` on `/api/health` — DNS or hosting still points at the old app. Admin login (`POST /api/auth/login`) will not work until this is fixed.

## Deploy (any host)

1. Build/run with Docker, or `npm install && npm start` on the server.
2. Set environment variables from `.env.example` (MongoDB, `JWT_SECRET`, `CLIENT_URL`, Razorpay, Cloudinary, etc.).
3. Set `NODE_ENV=production` and `PORT` (default `5000`).
4. Run `npm run seed:admin` once against production MongoDB if no admin exists.
5. Point DNS **`api.twinklingz.com`** to this process (reverse proxy with HTTPS).
6. Re-check the curl commands above, then test:

   `POST https://api.twinklingz.com/api/auth/login`

## Docker

```bash
docker build -t twinklingz-api .
docker run --env-file .env -p 5000:5000 twinklingz-api
```

After deploy, rebuild/redeploy the **frontend** only if you change `VITE_API_URL`.
