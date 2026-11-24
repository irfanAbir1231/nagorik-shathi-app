/**
 * What the discovery fetcher is allowed to read. Pure, so the rules are tested
 * without a network.
 *
 *  • Only HTTPS URLs on a source's allow-listed hosts (or their subdomains).
 *  • robots.txt is obeyed for our user agent, falling back to the `*` group.
 *  • A site that reserves its content from AI use — Cloudflare "content
 *    signals" (`ai-train=no`, `ai-input=no`) or blocking named AI crawlers —
 *    is marked `aiRestricted`: its pages may still be read for change
 *    detection and shown to an administrator, but no language model sees them.
 */

/** Identifies us to site operators. The robots.txt group we look for is `shebarjanalabot`. */
export const USER_AGENT = 'ShebarJanalaBot/1.0 (+https://nagorik-shathi-app.vercel.app; citizen service directory)';
const OUR_AGENT_TOKEN = 'shebarjanalabot';

/** Crawlers whose explicit exclusion signals the operator does not want AI use. */
const AI_CRAWLERS = ['claudebot', 'anthropic-ai', 'gptbot', 'ccbot', 'google-extended', 'applebot-extended', 'bytespider'];

/** True when [url] is HTTPS and its host is, or is a subdomain of, an allowed host. */
export function isAllowedUrl(url: string | URL, allowedHosts: readonly string[]): boolean {
  let parsed: URL;
  try {
    parsed = typeof url === 'string' ? new URL(url) : url;
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  if (parsed.username || parsed.password) return false;
  const host = parsed.hostname.toLowerCase();
  return allowedHosts.some((allowed) => {
    const a = allowed.toLowerCase().replace(/^\.+/, '');
    return host === a || host.endsWith(`.${a}`);
  });
}

/**
 * Hosts an admin may submit links from without registering a source first:
 * Bangladesh government domains only.
 */
export function isGovernmentHost(url: string): boolean {
  return isAllowedUrl(url, ['gov.bd']);
}

export interface RobotsPolicy {
  readonly allow: readonly string[];
  readonly disallow: readonly string[];
  /** The operator reserves content from AI use. */
  readonly aiRestricted: boolean;
}

export const PERMISSIVE_ROBOTS: RobotsPolicy = { allow: [], disallow: [], aiRestricted: false };

interface Group {
  agents: string[];
  allow: string[];
  disallow: string[];
}

export function parseRobots(text: string): RobotsPolicy {
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;
  let aiRestricted = false;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (field === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], allow: [], disallow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;

    if (field === 'content-signal') {
      if (/\bai-(train|input)\s*=\s*no\b/i.test(value)) aiRestricted = true;
      continue;
    }
    if (!current) continue;
    if (field === 'allow' && value) current.allow.push(value);
    if (field === 'disallow' && value) current.disallow.push(value);
  }

  // Excluding AI crawlers by name is a statement of intent about AI use.
  if (groups.some((g) => g.agents.some((a) => AI_CRAWLERS.includes(a)) && g.disallow.includes('/'))) {
    aiRestricted = true;
  }

  const ours = groups.find((g) => g.agents.some((a) => a.includes(OUR_AGENT_TOKEN)));
  const fallback = groups.find((g) => g.agents.includes('*'));
  const group = ours ?? fallback;
  return { allow: group?.allow ?? [], disallow: group?.disallow ?? [], aiRestricted };
}

/** robots.txt path matching with `*` wildcards and `$` anchors; longest match wins, allow wins ties. */
export function isPathAllowed(policy: RobotsPolicy, pathWithQuery: string): boolean {
  let best: { length: number; allow: boolean } | null = null;
  const consider = (rules: readonly string[], allow: boolean) => {
    for (const rule of rules) {
      if (!matchesRule(rule, pathWithQuery)) continue;
      const length = rule.length;
      if (!best || length > best.length || (length === best.length && allow)) best = { length, allow };
    }
  };
  consider(policy.disallow, false);
  consider(policy.allow, true);
  return best === null ? true : (best as { allow: boolean }).allow;
}

function matchesRule(rule: string, path: string): boolean {
  const anchored = rule.endsWith('$');
  const body = anchored ? rule.slice(0, -1) : rule;
  const pattern = body
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${pattern}${anchored ? '$' : ''}`).test(safeDecode(path));
}

function safeDecode(path: string): string {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}
