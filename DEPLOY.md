# Deploying Detour to Vercel

This is a checklist for shipping v1 to a real domain. Work top-to-bottom.

## 0. Prereqs

- Supabase project is set up and migrations 0001–0004 + the interests seed have been run
- Two test accounts have completed the M1–M7 verification flow locally
- A GitHub repo exists (or you're about to create one)
- A Vercel account exists (`vercel.com`)

## 1. Push to GitHub

If the project isn't on GitHub yet:

```bash
gh repo create detour --private --source=. --remote=origin --push
```

Or via the web UI: create an empty repo, then:

```bash
git remote add origin git@github.com:<you>/detour.git
git add .
git commit -m "Initial commit: Detour v1"
git push -u origin main
```

Verify `.env.local` is **not** in the commit. `.env.local.example` should be there as documentation.

## 2. Create the Vercel project

1. Vercel dashboard → **Add New** → **Project** → import the GitHub repo
2. Framework preset: **Next.js** (auto-detected)
3. Root directory: leave default
4. Build command: leave default (`next build`)
5. Output directory: leave default
6. **Don't deploy yet** — set env vars first (next step), or you'll get a successful build that crashes on first request

## 3. Set production env vars in Vercel

Project Settings → **Environment Variables**. Add each of these for **Production** (and optionally Preview):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from Supabase API settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase API settings |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase API settings — **mark as Sensitive** |
| `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` | your restricted browser key |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | optional; leave unset to use `DEMO_MAP_ID` |
| `GOOGLE_MAPS_SERVER_KEY` | your restricted server key — **mark as Sensitive** |
| `GOOGLE_GEMINI_API_KEY` | from aistudio.google.com — **mark as Sensitive** |
| `NEXT_PUBLIC_APP_URL` | your final prod URL, e.g. `https://detour.vercel.app` (or your custom domain) |

After deploy, you can edit `NEXT_PUBLIC_APP_URL` to match the actual assigned URL and redeploy.

## 4. Update Google Cloud restrictions

Open Google Cloud Console → APIs & Services → Credentials.

**Browser key** (`NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`):
- Application restrictions → HTTP referrers → add:
  - `http://localhost:3000/*` (keep — for local dev)
  - `https://*.vercel.app/*` (preview deploys)
  - `https://your-prod-domain.com/*` (if you have a custom domain)
- API restrictions: Maps JavaScript API + Places API (New) only

**Server key** (`GOOGLE_MAPS_SERVER_KEY`):
- Application restrictions → **None** (Vercel egress IPs aren't stable)
- API restrictions: Routes API + Places API (New) only
- Treat the secret value as the only protection — keep it server-only

## 5. Update Supabase Auth URLs

Supabase Dashboard → Authentication → **URL Configuration**:
- **Site URL**: your prod URL (`https://detour.vercel.app` or your custom domain)
- **Redirect URLs**: add `https://detour.vercel.app/auth/callback` and `https://*.vercel.app/auth/callback` (the latter covers preview deploys). Keep your localhost entries for local dev.

If you skip this, the email-confirmation link will still point to localhost and signup-via-invite will break in prod.

## 6. Vercel function timeouts

Match compute can take 10–15s. Vercel Hobby caps serverless functions at 10s. Two options:

- **Upgrade to Vercel Pro** — `maxDuration = 60` already set in `app/api/trips/[id]/match/route.ts`, no other changes needed
- **Stay on Hobby** — match compute will sometimes time out on long routes. Acceptable for tiny user testing; not for real use

## 7. Trigger the deploy

Push to `main` (or whichever branch you connected). Vercel will build. First build typically takes 1–2 minutes.

## 8. Smoke test in prod

Two real accounts in different browsers. Run the same flow you ran locally:

1. Sign up A → confirm via email link → land on `/profile`
2. Set name + ≥5 interests, save
3. Create trip with autocomplete addresses
4. Copy invite link → open in browser B (logged-out)
5. Sign up B (verify email confirmation lands on the prod callback, not localhost) → set profile + interests
6. Open invite link as B → Accept
7. As either A or B: click **Find our matches** → list + map populate within ~15s
8. Open a place → photos, hours, reviews load → Maps deep link opens the right app

If matches don't compute:
- Check Vercel function logs (`Functions` tab) for the match route
- Most likely: missing env var, or Google API not enabled / referrer-restricted incorrectly

## 9. Optional polish

- **Custom domain**: Vercel → Project → Domains → add. Update `NEXT_PUBLIC_APP_URL`, the Google referrer restriction, and Supabase Site URL + Redirect URLs accordingly.
- **Map ID**: Google Cloud → Map Styles → New Map ID (Vector). Set `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` to the new ID and you can customize map appearance.
- **Billing alerts**: Google Cloud → Billing → Budgets & alerts. Set a $5 alert. You're nowhere near the free tier limits at v1 scale, but a tripped alert means something is wrong.
