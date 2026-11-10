# Free deployment guide: Vercel + Turso (no SMS, demo accounts)

Goal: anyone with the APK can use the app, without your PC, at no cost.

| Part | Service | Cost |
|---|---|---|
| Backend (Next.js) | Vercel Hobby | free |
| Database | Turso | free tier |
| Role detection | your existing Jev API key | your paid API |
| Reply wording | built-in templates (`AI_PROVIDER=simulated`) | free |
| Voice | on-device recogniser in the phone | free |
| App distribution | send the APK (GitHub Releases / Drive) | free |

Why not Render: its free web service has 512 MB of memory and this app's build needs about
700 MB (measured: it runs out of memory at a 420 MB heap and passes at 700 MB). Vercel builds on
its own larger machines and its functions do not sleep for a minute like Render's free tier.

## What this version does and does not do

- **Works:** sign in with the seeded demo accounts (including moderator and administrator, as
  you decided), browse programmes, eligibility, AI chat (Jev + templates), saved items, plans,
  voice on phones that have the Bangla speech pack.
- **Does not work yet:** creating a new account, forgot-PIN, and sign-in by code. They need an
  SMS code, and there is no free SMS gateway. The demo APK hides those links (`OTP_FLOWS=false`).
- **Public demo accounts:** anyone who has the APK can sign in as any of them, including the
  administrator (PIN `4321`). That is fine for sample data and for a demonstration, but do not put
  real citizens' data in this database.

---

## Step 1: Turso database (free)

Use the website; the Turso command-line tool does not run natively on Windows.

1. Go to https://turso.tech and sign up (GitHub login is easiest).
2. **Create database** → name it `shebar-janala` → choose the location closest to Bangladesh
   (Singapore if offered).
3. Open the database and copy its **URL**. It looks like `libsql://shebar-janala-yourname.turso.io`.
4. Create an access token: in the database page choose **Generate token** (read & write, no
   expiry). Copy it somewhere private; it is shown once.

> Alternative with the CLI (inside WSL or Linux/macOS):
> ```bash
> curl -sSfL https://get.tur.so/install.sh | bash
> turso auth login
> turso db create shebar-janala            # add --location <code>; list codes with: turso db locations
> turso db show shebar-janala --url        # the libsql:// URL
> turso db tokens create shebar-janala     # the token
> ```

## Step 2: put the tables and the programme data into Turso

Run this from your PC, once. PowerShell, in the backend folder:

```powershell
cd D:\nagorik-shathi\ShebarJanala

# These apply to this PowerShell window only. They override .env.local.
$env:DATABASE_URL        = "libsql://shebar-janala-yourname.turso.io"
$env:DATABASE_AUTH_TOKEN = "PASTE_THE_TOKEN_HERE"

npx drizzle-kit push --force     # creates the tables
npm run db:seed                  # loads programmes, organisations and the demo accounts
```

The seed sends about 1,400 rows over the internet, so allow a few minutes. It ends by printing the
demo sign-ins. Then **close that PowerShell window** so the token does not linger.

If `db:push` complains about the token, check there are no spaces or quotes inside it.

## Step 3: generate the secrets

```powershell
cd D:\nagorik-shathi\ShebarJanala
node scripts/gen-secrets.mjs
```

It prints `JWT_SECRET`, `JWT_REFRESH_SECRET` and `FIELD_ENCRYPTION_KEY`. Keep the output private.
Generate once and keep them: changing the JWT secrets signs everyone out, and changing
`FIELD_ENCRYPTION_KEY` makes already-encrypted health data unreadable.

## Step 4: deploy to Vercel

1. Go to https://vercel.com and sign up with GitHub (choose the **Hobby** plan).
2. **Add New → Project** → import `irfanAbir1231/nagorik-shathi-app`. Leave the Root Directory as
   the repository root. The framework is detected as Next.js. (`vercel.json` already sets the
   Singapore region and skips builds for pushes that only touch `mobile/` or `docs/`.)
3. Before pressing Deploy, open **Environment Variables** and add these (Production):

| Name | Value |
|---|---|
| `DATABASE_URL` | the `libsql://...` URL from step 1 |
| `DATABASE_AUTH_TOKEN` | the Turso token |
| `JWT_SECRET` | from step 3 |
| `JWT_REFRESH_SECRET` | from step 3 |
| `FIELD_ENCRYPTION_KEY` | from step 3 |
| `OTP_DEV_ECHO` | `false` (the server refuses to start in production if this is on) |
| `AI_PROVIDER` | `simulated` |
| `JEV_API_KEY` | your Jev key |
| `RATE_LIMIT_AI_MAX_REQUESTS` | `10` (limits Jev calls per citizen per minute) |

4. Press **Deploy**. The first build takes a few minutes. You get a URL like
   `https://shebar-janala-xxxx.vercel.app`.

### Check it works

```powershell
$u = "https://YOUR-PROJECT.vercel.app"
curl.exe -s "$u/api/v1/auth/session"
curl.exe -s -H "X-Client: mobile" -H "Content-Type: application/json" `
  -d '{\"phone\":\"01712345678\",\"pin\":\"1234\"}' "$u/api/v1/auth/login"
```

The first should say `"authenticated":false`; the second should return a user and tokens.

If opening the URL in a browser shows a **Vercel login page**, go to the project's
**Settings → Deployment Protection** and turn protection off for Production.

If the deployment fails to start, the log lists exactly which production setting is wrong (it
names the missing or unsafe variable). Fix it in **Settings → Environment Variables** and
**Redeploy**.

## Step 5: build the APK that points at your server

```powershell
cd D:\nagorik-shathi\ShebarJanala\mobile
flutter build apk --release `
  --dart-define=API_BASE_URL=https://YOUR-PROJECT.vercel.app `
  --dart-define=DEMO_ACCOUNTS=true `
  --dart-define=OTP_FLOWS=false
```

The APK is `mobile\build\app\outputs\flutter-apk\app-release.apk`.

- `API_BASE_URL`: your Vercel URL, with no trailing slash.
- `DEMO_ACCOUNTS=true`: shows the role picker in this release build.
- `OTP_FLOWS=false`: hides create-account / forgot-PIN / code sign-in until SMS exists.

Install on your phone: `adb install -r mobile\build\app\outputs\flutter-apk\app-release.apk`
(this is the same adb path as before). To give it to others, upload the APK as a **GitHub Release**
on the repository, or share it from Google Drive. Testers must allow "install unknown apps".

## Day-to-day

- **Update the backend:** push to `main`; Vercel redeploys on its own.
- **Update the app:** rebuild the APK (step 5) and share it again. Keep using the same machine's
  signing key so updates install over the old version.
- **Reset the demo data:** repeat step 2 (`npm run db:seed` is repeatable).
- **Cost control:** the AI limit above caps Jev calls per person; only seeded accounts can chat,
  which keeps total use small. Watch your Jev dashboard the first week.

## Known limits and what to do later

1. **Next.js 15 is out of support.** Upgrade before real users, because this holds personal data.
2. **No SMS yet.** When you have a provider, set `SMS_PROVIDER`, `SMS_API_KEY`, `SMS_SENDER_ID`
   (see `.env.example`), then rebuild the APK without `OTP_FLOWS=false`.
   *Optional, for a live demonstration only:* `SMS_PROVIDER=demo` sends nothing; it saves each
   message in a table that an administrator reads at `/admin/sms-outbox` on the web app. You could
   register someone live and read their code out loud. It is not self-service, so leave it off for
   ordinary testers.
3. **Vercel Hobby is for non-commercial use** and its limits change; check them before a launch.
4. **Debug-signed release APK.** Fine for sideloading. Google Play needs a proper signing key and a
   $25 developer account.
