# Shebar Janala — mobile app (Flutter)

Citizen app for the Shebar Janala backend (`/api/v1/*`, Next.js), which lives in the repo root.
See `../docs/technical/Flutter-Mobile-App-Implementation-Guideline.md` for the full plan.

## Run

1. From the repo root, start the backend (`npm run dev`, seeded with `npm run setup`). It must include the
   bearer-token support (`X-Client: mobile`, `src/lib/http/mobile.ts`).
2. From `mobile/`. Android emulator:
   `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000`
   Physical phone: use your PC's LAN IP, e.g. `http://192.168.1.20:3000` (same Wi-Fi, allow port 3000
   in the firewall). Plain HTTP is for development only.
3. Demo login: `01712345678` / `1234`.

## Test

```
flutter analyze
flutter test                                   # unit + widget
flutter test --tags live --run-skipped \
  --dart-define=API_BASE_URL=http://localhost:3000   # against a real backend
```

After editing `lib/l10n/*.arb`: `flutter gen-l10n`.

## Layout

```
lib/core/       network (ApiClient, ApiResult), storage (TokenStore), i18n helpers
lib/features/   auth, home  (data / domain / application / presentation)
lib/l10n/       app_bn.arb, app_en.arb  (Bangla is the default)
```

Rules: widgets never call Dio; branch on the API error `code`, not its message; the refresh
token is exchanged once at a time (the server treats a replayed token as theft).
