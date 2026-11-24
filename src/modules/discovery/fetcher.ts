import { isAllowedUrl, isPathAllowed, parseRobots, PERMISSIVE_ROBOTS, USER_AGENT, type RobotsPolicy } from './policy';

/**
 * The only code that fetches government pages. Every request:
 *  • is HTTPS to an allow-listed host (redirects are re-checked hop by hop);
 *  • is allowed by that host's robots.txt;
 *  • waits at least a second after the previous request to the same host;
 *  • is cut off after 15 s and 3 MB, and must be HTML.
 */

export type FetchBlockReason = 'host' | 'robots' | 'redirect' | 'size' | 'type' | 'status' | 'network' | 'timeout';

export class FetchBlocked extends Error {
  constructor(
    readonly reason: FetchBlockReason,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'FetchBlocked';
  }
}

export interface FetchedPage {
  /** The final URL after redirects. */
  readonly url: string;
  readonly status: number;
  readonly html: string;
  /** robots.txt reserves this site's content from AI use. */
  readonly aiRestricted: boolean;
}

const TIMEOUT_MS = 15_000;
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const MIN_GAP_MS = 1_000;
const ROBOTS_TTL_MS = 60 * 60 * 1000;

const robotsCache = new Map<string, { policy: RobotsPolicy; at: number }>();
const lastRequestAt = new Map<string, number>();

async function politeWait(host: string): Promise<void> {
  const last = lastRequestAt.get(host) ?? 0;
  const wait = last + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt.set(host, Date.now());
}

async function rawGet(url: URL, accept: string): Promise<Response> {
  await politeWait(url.host);
  const headers = { 'User-Agent': USER_AGENT, Accept: accept, 'Accept-Language': 'bn,en;q=0.8' };
  const viaNode = await nodeGet(url, headers);
  if (viaNode) return viaNode;
  try {
    return await fetch(url, { redirect: 'manual', headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    throw new FetchBlocked(timedOut ? 'timeout' : 'network', `Could not reach ${url.host}.`);
  }
}

type NodeHttps = typeof import('node:https');
let nodeTransport: Promise<{ https: NodeHttps; agent: import('node:https').Agent } | null> | null = null;

/**
 * On Node, requests go through `https` with Node's trusted roots plus the
 * public intermediates in ca.ts, because several government sites omit
 * theirs (see ca.ts). Certificates are still fully verified. Elsewhere (an
 * edge runtime without node:https) this returns null and plain fetch is used.
 */
async function nodeGet(url: URL, headers: Record<string, string>): Promise<Response | null> {
  nodeTransport ??= (async () => {
    try {
      const [https, tls, { EXTRA_INTERMEDIATES }] = await Promise.all([import('node:https'), import('node:tls'), import('./ca')]);
      const agent = new https.Agent({ ca: [...tls.rootCertificates, ...EXTRA_INTERMEDIATES], keepAlive: false });
      return { https, agent };
    } catch {
      return null;
    }
  })();
  const transport = await nodeTransport;
  if (!transport) return null;

  return new Promise<Response>((resolve, reject) => {
    const request = transport.https.get(url, { agent: transport.agent, headers, timeout: TIMEOUT_MS }, (incoming) => {
      try {
        const responseHeaders = new Headers();
        for (const [key, value] of Object.entries(incoming.headers)) {
          try {
            if (typeof value === 'string') responseHeaders.set(key, value);
            else if (Array.isArray(value)) value.forEach((v) => responseHeaders.append(key, v));
          } catch {
            // A header the Fetch API cannot hold (e.g. non-ASCII); none we read.
          }
        }
        // The body as a web stream, built from the response's own events so it
        // does not depend on stream helpers a bundler may replace.
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            incoming.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
            incoming.on('end', () => controller.close());
            incoming.on('error', (error) => controller.error(error));
          },
          cancel() {
            incoming.destroy();
          },
        });
        const status = incoming.statusCode ?? 502;
        resolve(new Response(status === 204 || status === 304 ? null : body, { status, headers: responseHeaders }));
      } catch (error) {
        incoming.destroy();
        reject(new FetchBlocked('network', `Could not read the answer from ${url.host} (${error instanceof Error ? error.message : String(error)}).`));
      }
    });
    request.on('timeout', () => request.destroy(new FetchBlocked('timeout', `Could not reach ${url.host} in time.`)));
    request.on('error', (error) =>
      reject(error instanceof FetchBlocked ? error : new FetchBlocked('network', `Could not reach ${url.host} (${(error as NodeJS.ErrnoException).code ?? error.message}).`)),
    );
  });
}

/** The host's robots policy. A missing or unreadable robots.txt allows everything. */
export async function robotsFor(origin: string): Promise<RobotsPolicy> {
  const cached = robotsCache.get(origin);
  if (cached && Date.now() - cached.at < ROBOTS_TTL_MS) return cached.policy;
  let policy = PERMISSIVE_ROBOTS;
  try {
    const response = await rawGet(new URL('/robots.txt', origin), 'text/plain');
    if (response.ok) policy = parseRobots((await readCapped(response, 256 * 1024)).text);
    else await response.body?.cancel();
  } catch {
    // Unreachable robots.txt: treat as no rules, the page fetch will fail on its own if the host is down.
  }
  robotsCache.set(origin, { policy, at: Date.now() });
  return policy;
}

async function readCapped(response: Response, maxBytes: number): Promise<{ text: string; truncated: boolean }> {
  const reader = response.body?.getReader();
  if (!reader) return { text: '', truncated: false };
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return { text: '', truncated: true };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { text: new TextDecoder('utf-8').decode(bytes), truncated: false };
}

/** Fetches one HTML page under the rules above, or throws FetchBlocked. */
export async function fetchPage(rawUrl: string, allowedHosts: readonly string[]): Promise<FetchedPage> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new FetchBlocked('host', 'That is not a valid web address.');
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (!isAllowedUrl(url, allowedHosts)) {
      throw new FetchBlocked(hop === 0 ? 'host' : 'redirect', `${url.host} is not on the list of allowed government sites.`);
    }
    const robots = await robotsFor(url.origin);
    if (!isPathAllowed(robots, url.pathname + url.search)) {
      throw new FetchBlocked('robots', `${url.host} asks crawlers not to read this page.`);
    }

    const response = await rawGet(url, 'text/html,application/xhtml+xml');
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location) throw new FetchBlocked('redirect', 'The page redirected without saying where.');
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new FetchBlocked('status', `The site answered ${response.status}.`, response.status);
    }
    const type = response.headers.get('content-type') ?? '';
    if (!/text\/html|application\/xhtml/i.test(type)) {
      await response.body?.cancel();
      throw new FetchBlocked('type', 'That link is not a web page (it may be a PDF). Open it and enter the details by hand.');
    }
    const { text, truncated } = await readCapped(response, MAX_BYTES);
    if (truncated) throw new FetchBlocked('size', 'The page is too large to read.');
    return { url: url.toString(), status: response.status, html: text, aiRestricted: robots.aiRestricted };
  }
  throw new FetchBlocked('redirect', 'The page redirected too many times.');
}
