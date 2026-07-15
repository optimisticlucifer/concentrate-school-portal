# Deployment

The whole stack runs from the root `Dockerfile` (targets `api` and `web`) orchestrated
by `docker-compose.yml` — Next.js web + Fastify API + Postgres 17 + Redis 7.

## Option A — Coolify (recommended, self-hosted)

Coolify runs the Compose stack and terminates TLS at its own proxy.

1. New Resource → Docker Compose → point at this repo (`docker-compose.yml`).
2. Set environment variables on the `api` service:
   - `JWT_SECRET` — long random string
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — from Google Cloud Console
   - `APP_URL` — the public URL Coolify assigns (e.g. `https://portal.example.com`)
   - `ANTHROPIC_API_KEY` — optional, enables the chatbot
3. Set the `web` domain in Coolify to your public URL; Coolify's proxy provisions the certificate automatically.
4. Deploy. The API auto-runs migrations on boot. Seed once from the app container:
   `docker compose exec api node apps/api/dist/db/seed.js`
5. Add the Google OAuth redirect URI in the Cloud Console:
   `https://<your-domain>/api/auth/google/callback`

The web service proxies `/api/*` to the API container (`API_ORIGIN=http://api:4000`),
so cookies stay first-party — no CORS needed in production.

## Option B — Manual self-hosted (Docker Compose + Nginx + Certbot)

As specified in SPECS.md, for a plain VM without Coolify:

```bash
git clone <repo> && cd concentrate-school-portal
cp .env.example .env   # fill JWT_SECRET, GOOGLE_*, APP_URL, ANTHROPIC_API_KEY
docker compose up -d --build
docker compose exec api node apps/api/dist/db/seed.js   # optional demo data
```

Nginx reverse proxy (`/etc/nginx/sites-available/portal`):

```nginx
server {
  listen 80;
  server_name portal.example.com;

  location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

```bash
ln -s /etc/nginx/sites-available/portal /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d portal.example.com   # provisions + auto-renews TLS
```

Set `NODE_ENV=production` so auth cookies are marked `Secure`.

## Local development

```bash
npm install
docker compose up -d postgres redis
cp .env.example .env
npm run db:seed
npm run dev:api      # http://localhost:4000
npm run dev:web      # http://localhost:3000
```

Demo accounts (password `password123`): `admin@` · `teacher@` · `student1@concentrate.test`.
