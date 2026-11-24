import type { SourceKind } from '@/lib/domain/enums';

/**
 * Government sites the discovery job starts with. Chosen after checking them
 * on 2026-11-23 (adminpanelImplementation.md §5.7):
 *
 *  • dss.gov.bd — watched: server-rendered programme pages with amounts and
 *    eligibility, a sitemap and a notices table; no robots.txt restrictions.
 *  • socialprotection.gov.bd — links added by hand for now: the national
 *    programme catalogue, permissive robots.txt and a sitemap, but its
 *    programme list's structure is not yet confirmed for an adapter.
 *  • dghs.gov.bd — links added by hand only: its robots.txt reserves content
 *    from AI use, which the fetcher detects and honours on every read.
 *
 * `organizationWebsite` links a source to a seeded organisation by website.
 */
export interface SeedSource {
  readonly name: string;
  readonly baseUrl: string;
  readonly kind: SourceKind;
  readonly allowedHosts: readonly string[];
  readonly listPaths: readonly string[];
  readonly pagesPerRun: number;
  readonly enabled: boolean;
  readonly organizationWebsite: string | null;
}

export const SEED_SOURCES: readonly SeedSource[] = [
  {
    name: 'Department of Social Services (dss.gov.bd)',
    baseUrl: 'https://dss.gov.bd/',
    kind: 'dss_portal',
    allowedHosts: ['dss.gov.bd'],
    listPaths: ['/views/sitemap', '/pages/notices'],
    pagesPerRun: 8,
    enabled: true,
    organizationWebsite: 'https://dss.gov.bd',
  },
  {
    name: 'Social Protection programme site (socialprotection.gov.bd)',
    baseUrl: 'https://socialprotection.gov.bd/',
    kind: 'manual',
    allowedHosts: ['socialprotection.gov.bd'],
    listPaths: [],
    pagesPerRun: 5,
    enabled: true,
    organizationWebsite: null,
  },
  {
    name: 'Directorate General of Health Services (dghs.gov.bd)',
    baseUrl: 'https://dghs.gov.bd/',
    kind: 'manual',
    allowedHosts: ['dghs.gov.bd'],
    listPaths: [],
    pagesPerRun: 5,
    enabled: true,
    organizationWebsite: 'https://dghs.gov.bd',
  },
];
