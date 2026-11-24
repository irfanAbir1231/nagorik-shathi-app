import { decodeEntities, extractLinks, htmlToText, pageTitle, type PageLink } from './text';

/**
 * Reader for sites on the Bangladesh government portal platform, starting with
 * dss.gov.bd (Department of Social Services). Checked against the live site on
 * 2026-11-23:
 *
 *  • `/views/sitemap` links every content page (`/pages/static-pages/…`), about
 *    190 of them, most of which are offices, committees and budgets.
 *  • `/pages/notices` is a table of notices (title, PDF, publish date), most of
 *    which are staff orders (transfers, extra duties).
 *  • A content page's body is the `ContentViewerWidget` block, which starts
 *    with a "last updated" line; everything above it is header and slider.
 *
 * Programme pages and service notices are picked by Bangla keywords. The
 * filter is deliberately loose: an administrator reviews every result, and a
 * missed programme costs more than a rejected false positive.
 */

const SERVICE_WORDS =
  /(ভাতা|কর্মসূচি|কর্মসুচি|উপবৃত্তি|বৃত্তি|অনুদান|সহায়তা|ঋণ|পুনর্বাসন|জীবনমান উন্নয়ন|চিকিৎসা|আবেদন|allowance|programme|program|stipend|grant)/i;

const NOT_A_PROGRAMME =
  /(অধিশাখা|অফিসার|কর্মকর্তা|কমিটি|বাজেট|বিভাগ$|কার্যালয়|নীতিমালা|চার্টার|পরিচালক|ফোকাল|কোড|ফরম|ক্রয়|দিবস|মডিউল|বরাদ্দ|প্রকল্প পরিচালক|টিম|বদলি|পদায়ন|দায়িত্ব|ছুটি|সংযুক্ত|পদোন্নতি|নিয়োগ|প্রশিক্ষণ মডিউল|ইনোভেশন|শুদ্ধাচার|আবেদনপত্র|আপীল|আপিল|তথ্য প্রাপ্তি)/;

/** Content pages in the sitemap that look like programmes or services. */
export function programmeLinks(sitemapHtml: string, base: string): PageLink[] {
  // The sitemap lists some programmes under two menus with different URLs;
  // the first one wins so a programme becomes one candidate, not two.
  const byTitle = new Map<string, PageLink>();
  for (const link of extractLinks(sitemapHtml, base)) {
    if (!link.url.includes('/pages/static-pages/') || !looksLikeService(link.text)) continue;
    if (!byTitle.has(link.text)) byTitle.set(link.text, link);
  }
  return [...byTitle.values()];
}

export function looksLikeService(title: string): boolean {
  return SERVICE_WORDS.test(title) && !NOT_A_PROGRAMME.test(title);
}

export interface NoticeRow {
  readonly title: string;
  readonly url: string;
  readonly fileUrl: string | null;
  /** As printed, e.g. "২৩-১১-২০২৬". */
  readonly published: string | null;
}

/** Rows of the notices table that look like services (not staff orders). */
export function serviceNotices(noticesHtml: string, base: string): NoticeRow[] {
  const rows: NoticeRow[] = [];
  const cleaned = noticesHtml.replace(/<!--[\s\S]*?-->/g, ' ');
  for (const row of cleaned.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = row[1] ?? '';
    const titleCell = cells.match(/data-column="title"[^>]*>([\s\S]*?)<\/td>/i);
    if (!titleCell) continue;
    const title = decodeEntities(titleCell[1]!.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (!title || !looksLikeService(title)) continue;

    const links = extractLinks(cells, base);
    const page = links.find((l) => l.url.includes('/pages/notices/'));
    if (!page) continue;
    const file = links.find((l) => /\.pdf($|\?)/i.test(l.url));
    const date = cells.match(/data-column="publish_date"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/i);
    rows.push({ title, url: page.url, fileUrl: file?.url ?? null, published: date?.[1]?.trim() ?? null });
  }
  return rows;
}

export interface PageContent {
  readonly title: string | null;
  readonly text: string;
  readonly links: PageLink[];
  /** The page's own "last updated" line, if it has one. */
  readonly updatedLine: string | null;
}

/**
 * The readable part of a portal page. Falls back to the whole document when
 * the content widget is missing (another template), so nothing is lost.
 */
export function pageContent(html: string, url: string): PageContent {
  const start = html.search(/data-widget_name="ContentViewerWidget"/);
  let fragment = html;
  if (start >= 0) {
    const rest = html.slice(start);
    const end = rest.search(/<footer\b|data-widget_name="(?!ContentViewerWidget)[^"]+"/);
    fragment = end > 0 ? rest.slice(0, end) : rest;
  }
  fragment = decodeRichText(fragment.replace(/^[^>]*>/, ''));
  const heading = fragment.match(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/i);
  const headingText = heading ? htmlToText(heading[1]!).replace(/\s+/g, ' ').trim() : '';
  const text = htmlToText(fragment)
    .split('\n')
    .filter((line) => !/^(কন্টেন্ট|কনটেন্ট|content)\s*:/i.test(line)) // the "Content: page" label chip
    .join('\n');
  const updatedLine = text.split('\n').find((line) => /(হাল-নাগাদ|last updated)/i.test(line)) ?? null;
  return { title: bestTitle(headingText, pageTitle(html)), text, links: extractLinks(fragment, url), updatedLine };
}

/** Portal section names that sometimes stand in for a page's real title. */
const GENERIC_TITLES = /^(পাতা|পৃষ্ঠা|page|নোটিশ|notice|সেবা|service)$/i;

function bestTitle(heading: string, documentTitle: string | null): string | null {
  if (heading && !GENERIC_TITLES.test(heading)) return heading;
  if (documentTitle && !GENERIC_TITLES.test(documentTitle)) return documentTitle;
  return heading || documentTitle;
}

/**
 * The portal ships page bodies base64-encoded inside
 * `<rt-renderer encoded-content="…">` and decodes them in the browser. This
 * does the same, so the text can be read. Undecodable blocks are dropped.
 */
export function decodeRichText(fragment: string): string {
  return fragment.replace(
    /<rt-renderer\b[^>]*\bencoded-content="([A-Za-z0-9+/=\s]*)"[^>]*>(?:\s*<\/rt-renderer>)?/gi,
    (_match, encoded: string) => {
      try {
        const binary = atob(encoded.replace(/\s+/g, ''));
        if (binary.length > 2_000_000) return ' ';
        const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
        return ` ${new TextDecoder('utf-8').decode(bytes)} `;
      } catch {
        return ' ';
      }
    },
  );
}
