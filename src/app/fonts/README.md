# Bundled fonts

Loaded by `src/app/[locale]/layout.tsx` through `next/font/local`, so the production build
needs no network access.

| File | Family | Subset | Weights | Source |
|---|---|---|---|---|
| `inter-latin.woff2` | Inter | latin | 400-700 (variable) | Google Fonts |
| `noto-sans-bengali-bengali.woff2` | Noto Sans Bengali | bengali | 400-700 (variable) | Google Fonts |
| `jetbrains-mono-latin.woff2` | JetBrains Mono | latin | 500 | Google Fonts |

All three are licensed under the SIL Open Font License 1.1, which allows bundling and
redistribution with an application.

To refresh them, download the matching `woff2` files from
`https://fonts.googleapis.com/css2?family=<Family>:wght@<weights>` (the `/* latin */` or
`/* bengali */` block) and replace the files here.
