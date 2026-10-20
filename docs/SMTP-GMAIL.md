# Gmail SMTP — order confirmation + PDF invoice

When a customer **pays successfully** (Razorpay verified), the API emails the **checkout email address** with:

- Order confirmation (HTML)
- **PDF tax invoice** attached

No extra storefront code is required. You only configure SMTP on the **API server** (`twinklingz-backend`).

## 1. Google account requirements

Use your **business Gmail** or **Google Workspace** inbox (e.g. `you@gmail.com` or `hello@twinklingz.com`).

1. Turn on **2-Step Verification** for that Google account:  
   [https://myaccount.google.com/security](https://myaccount.google.com/security)
2. Create an **App password** (not your normal Gmail password):  
   [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)  
   - App: **Mail**  
   - Device: **Other** → name it `Twinklingz API`  
   - Copy the **16-character** password (no spaces).

> If you do not see App passwords, 2FA is not enabled yet, or your org disables them (some Workspace policies).

## 2. Add to server `.env`

On your VPS, edit `/var/www/twinklingz-backend/.env` (paths may differ):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-business@gmail.com
SMTP_PASS=abcdabcdabcdabcd
SMTP_FROM="Twinklingz" <your-business@gmail.com>
STOREFRONT_URL=https://twinklingz.com
```

**Important**

| Variable | What to use |
|----------|-------------|
| `SMTP_USER` | Full Gmail / Workspace address |
| `SMTP_PASS` | **App password** only (16 chars) |
| `SMTP_FROM` | For Gmail, use the **same address** as `SMTP_USER` (or a Workspace alias you own). Do not use a random `@twinklingz.com` address unless that mailbox exists in Workspace. |

Never commit `.env` or share the app password in chat or GitHub.

## 3. Restart API

```bash
cd /var/www/twinklingz-backend
pm2 restart twinklingz-api
```

## 4. Test SMTP (no real order needed)

```bash
npm run test:smtp -- your-business@gmail.com
```

You should receive a short test email. If it fails, read the error (wrong password, blocked sign-in, etc.).

Also run:

```bash
npm run check:connections
```

SMTP shows `OK` when verify succeeds.

## 5. Test a real checkout

1. Place a test order on the shop with a **real inbox you can open**.
2. Complete Razorpay payment (test mode or live).
3. Within a minute, that inbox should get **Order confirmed — TZ-…** with PDF attached.

Check API logs if nothing arrives:

```bash
pm2 logs twinklingz-api --lines 80
```

Look for `[email] Order confirmation sent to` or `[email] SMTP not configured`.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `SMTP not configured` in logs | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` missing in `.env`; restart PM2 after edit |
| `Invalid login` / `535` | Wrong app password; create a new app password |
| Email not received | Check spam; confirm checkout email spelling |
| `Gmail blocked` | Google security alert → allow the sign-in; use app password |
| Paid order, no email | Confirm payment hit `markOrderPaid` (Razorpay verify route); check logs |

## What we need from you (setup checklist)

1. **Business Gmail address** (the one that will send mail).
2. **App password** — you paste it only into **server `.env`**, not into the repo.
3. Confirm **2-Step Verification** is on for that Google account.
4. After you update `.env`, run `npm run test:smtp` on the server and tell us if the test mail arrived.

We do **not** need your normal Gmail password.
