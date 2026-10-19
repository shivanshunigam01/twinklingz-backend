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

## VPS + nginx + PM2 (Ubuntu)

On the server (`/var/www/twinklingz-backend`):

```bash
git pull
npm ci
cp .env.example .env   # or keep your existing .env
# edit .env — MONGODB_URI, JWT_SECRET, CLIENT_URL, etc.

# 1) Test Node directly (must return JSON, not hang)
curl -s http://127.0.0.1:5000/api/health

# If that fails, run manually and read the error:
PORT=5000 NODE_ENV=production node src/index.js
```

Run under PM2:

```bash
npm install -g pm2   # if needed
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup          # follow the printed command
```

Nginx must proxy to the same port as `PORT` (default **5000**). Example: `deploy/nginx-api.twinklingz.com.conf`.

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Wrong app on port 5000 (NOT_FOUND on `/api/health`)

If this returns Patliputra-style JSON (`success: false`, `NOT_FOUND`) instead of `{"ok":true,"service":"twinklingz-api"}`, **another Node app is bound to port 5000**, not this repo.

```bash
sudo ss -tlnp | grep ':5000'
# or: sudo lsof -i :5000
pm2 list                    # stop/delete any old API (e.g. patliputra)
pm2 delete all              # only if nothing else on this VPS needs those processes
cd /var/www/twinklingz-backend && git pull && npm ci
pm2 start ecosystem.config.cjs
curl -s http://127.0.0.1:5000/api/health
```

Only one process can use `PORT=5000`. Nginx `proxy_pass` must point at whichever port **twinklingz-api** uses.

### Fix **502 Bad Gateway**

502 means **nginx is up but nothing is answering on `proxy_pass`**.

| Check | Command |
|--------|---------|
| Is Node listening? | `ss -tlnp \| grep 5000` or `curl -s http://127.0.0.1:5000/api/health` |
| PM2 running? | `pm2 status` → `twinklingz-api` should be **online** |
| PM2 logs | `pm2 logs twinklingz-api --lines 50` |
| Wrong nginx port | `grep proxy_pass /etc/nginx/sites-enabled/*` — must be `http://127.0.0.1:5000` if `PORT=5000` |
| MongoDB blocked startup (old builds) | `git pull` — server now listens even if MongoDB fails; fix Atlas IP allowlist / `MONGODB_URI` |

**MongoDB Atlas:** add your VPS public IP (or `0.0.0.0/0` temporarily) under Network Access, or connections fail and login routes return errors.

After `curl http://127.0.0.1:5000/api/health` works on the server, `curl https://api.twinklingz.com/api/health` should work too.
