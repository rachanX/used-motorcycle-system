# Deploy to Vercel — Step by Step

## Prerequisites
- GitHub account
- Vercel account (free) — sign up at vercel.com with your GitHub account

---

## Step 1: Push to GitHub

1. Go to github.com → click **New repository**
2. Name it: `used-motorcycle-system`
3. Set to **Private**, click **Create repository**
4. On your computer, open terminal in the project folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/used-motorcycle-system.git
git push -u origin main
```

---

## Step 2: Import to Vercel

1. Go to **vercel.com** → click **Add New Project**
2. Click **Import** next to your `used-motorcycle-system` repo
3. Vercel will auto-detect Next.js — leave all settings as default
4. **Do NOT click Deploy yet** — set environment variables first (Step 3)

---

## Step 3: Set Environment Variables

In the Vercel import screen, click **Environment Variables** and add these 4:

| Name | Value | Where to find it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase → Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Supabase → Settings → API → service_role secret key |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` | You'll get this URL after first deploy — set it then redeploy |

---

## Step 4: Deploy

Click **Deploy**. Vercel will build and deploy in ~2 minutes.

---

## Step 5: Fix NEXT_PUBLIC_SITE_URL

After the first deploy:
1. Copy your Vercel URL (e.g. `https://used-motorcycle-system.vercel.app`)
2. Go to Vercel → Your Project → **Settings → Environment Variables**
3. Edit `NEXT_PUBLIC_SITE_URL` and paste the real URL
4. Go to **Deployments → Redeploy** (no cache)

---

## Step 6: Update Supabase Auth redirect URLs

1. Go to Supabase → **Authentication → URL Configuration**
2. Add your Vercel URL to **Redirect URLs**:
   ```
   https://your-app.vercel.app/**
   ```
3. Set **Site URL** to: `https://your-app.vercel.app`

---

## Step 7: Run final database migrations

If you haven't already run all migrations on your live Supabase database:
```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

---

## Done ✅

Your app is live. Every time you push code to GitHub `main` branch, Vercel auto-redeploys in ~1 minute.

---

## Custom domain (optional, free)

Vercel → Your Project → **Settings → Domains** → Add your domain → follow the DNS instructions from your domain registrar.
