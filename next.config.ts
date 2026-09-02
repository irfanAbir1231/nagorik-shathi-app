import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /**
   * Build output directory, overridable so a verification build cannot destroy a
   * running dev server.
   *
   * `next dev` and `next build` both own `.next` by default, and their contents
   * are not interchangeable: a production build replaces the dev server's vendor
   * chunks, after which every request fails with `Cannot find module
   * './vendor-chunks/zod.js'` until `.next` is deleted. The dev server does not
   * recover on its own and the error names a file nobody wrote, so it reads as a
   * dependency problem rather than as two processes fighting over a directory.
   *
   * This matters because the README asks for `npm run build` as a verification
   * step, which people naturally run in a second terminal while the app is up.
   * `npm run build:verify` sets this to a scratch directory instead.
   */
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // BDS §4.7 / §12: the first screen must stay small on 2G. Keep the client bundle honest.
  productionBrowserSourceMaps: false,
  // Pin the trace root to this project. A lockfile in the parent directory makes
  // Next infer the wrong workspace root, which silently drags unrelated files
  // into the server trace.
  outputFileTracingRoot: __dirname,
  /**
   * `@libsql/client/web` statically imports both its WebSocket and HTTP
   * transports (only one runs, chosen by URL scheme at request time), and
   * the WebSocket one depends on `@libsql/isomorphic-ws`, which ships a
   * `workerd`-conditioned build (`web.mjs`/`web.cjs`) alongside its default
   * Node one. Next's own file trace resolves under Node's conditions only,
   * so it never copies the workerd files into the standalone output — and
   * when the Cloudflare build later re-resolves the same import under the
   * `workerd` condition, those files are missing. Force-including them here
   * is enough: the WebSocket transport is never actually reached (Turso is
   * always addressed over HTTPS in this app), so the files only need to be
   * present for the bundler, not correct for the runtime.
   */
  outputFileTracingIncludes: {
    '**/*': [
      './node_modules/@libsql/isomorphic-ws/web.mjs',
      './node_modules/@libsql/isomorphic-ws/web.cjs',
    ],
  },
  /**
   * Typed routes are OFF deliberately, not by omission.
   *
   * next-intl owns navigation through `createNavigation`, and its typed-pathname
   * form (`href={{ pathname, params }}`) requires a `pathnames` config that this
   * app does not use — every link is a plain locale-prefixed string. Enabling
   * typed routes on top of that produces type errors on correct links, which
   * trains people to cast rather than to fix.
   */
  typedRoutes: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // PRD §48 — Helmet-equivalent hardening at the edge.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(self), microphone=(self), camera=(self)' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // next/font self-hosts; no external font or CDN origins are permitted.
              "font-src 'self' data:",
              "img-src 'self' data: blob:",
              "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''),
              "style-src 'self' 'unsafe-inline'",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);

/**
 * Opt-in, not automatic: this spins up a local `workerd` process that
 * emulates Cloudflare bindings (R2, KV, ...) for `next dev`, and that
 * process holds a lock on `.open-next/` for as long as the dev server runs.
 * Making it unconditional (as the `opennextjs-cloudflare` scaffolding tool
 * does by default) means a `next dev` left running from an earlier session
 * silently blocks every later `opennextjs-cloudflare build` with an EPERM on
 * `.open-next/assets` — exactly the "verification step fights the dev
 * server" failure this project has already been burned by once (see
 * `distDir` above). Nothing in this app reads a Cloudflare binding yet, so
 * default dev has no need for the emulation either.
 */
if (process.env.CF_DEV_BINDINGS === 'true') {
  import('@opennextjs/cloudflare').then((m) => m.initOpenNextCloudflareForDev());
}
