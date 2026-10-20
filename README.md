# Twinklingz API (Node.js + MongoDB)

Standalone backend for the **Twinklingz storefront** and **admin panel** (`twinklingz-sparkle-suite`). The frontend talks to this service over HTTP (`VITE_API_URL`).

## Setup

1. Copy `.env.example` to `.env` and fill in MongoDB, JWT, Cloudinary, Razorpay, and admin seed credentials.

2. Install and run:

```bash
npm install
npm run check:connections   # optional: test MongoDB + Cloudinary
npm run seed:admin          # first admin user
npm run import:products -- --category Necklaces path/to/products.zip   # bulk upload images to Cloudinary + MongoDB
npm run import:folders -- --replace-all --copy-catalog-to ../twinklingz-sparkle-suite/public/catalog "C:/path/wetransfer_folder1" "C:/path/wetransfer_folder2"
npm run dev
```

API base URL: `http://localhost:5000/api`

Production: deploy this repo to `api.twinklingz.com` and confirm `curl -s https://api.twinklingz.com/api/health` returns `"service":"twinklingz-api"`. See [DEPLOY.md](./DEPLOY.md).

Point the frontend `.env` at:

```env
VITE_API_URL=http://localhost:5000/api
```

For production, set `CLIENT_URL` to your deployed storefront origin (comma-separated for multiple).

## Main endpoints

| Area | Method | Path |
|------|--------|------|
| Health | GET | `/api/health` |
| Admin login | POST | `/api/auth/login` |

After Razorpay payment is verified, the API emails the customer an order confirmation **with a PDF tax invoice attached** when SMTP env vars are set (see `.env.example`). Admins can download the same PDF from **Admin → Orders**.
| Products (public) | GET | `/api/products`, `/api/products/:slug` |
| Site settings (public) | GET | `/api/settings` |
| Form submissions | POST | `/api/submissions` |
| Create order | POST | `/api/orders` |
| Razorpay (Standard Checkout) | POST | `/api/create-order`, `/api/verify-payment` |
| Admin (Bearer token) | * | `/api/admin/products`, `/orders`, `/submissions`, `/settings`, `/reports/summary` |

## Repo layout

```
twinklingz/
  twinklingz-backend/          ← this repo
  twinklingz-sparkle-suite/    ← Vite app (shop + /admin)
```

Initialize git in this folder separately if you want its own remote:

```bash
git init
git add .
git commit -m "Twinklingz API"
```
