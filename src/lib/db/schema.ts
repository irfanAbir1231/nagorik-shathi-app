import { sql, relations } from 'drizzle-orm';
import { sqliteTable, text, integer, real, index, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core';
import {
  USER_ROLES, USER_STATUSES, OPPORTUNITY_CATEGORIES, ORGANIZATION_TYPES, OPPORTUNITY_STATUSES,
  VERIFICATION_STATUSES, GENDERS, MARITAL_STATUSES, EDUCATION_LEVELS, OCCUPATIONS, DISABILITY_TYPES,
  ELIGIBILITY_OUTCOMES, MESSAGE_ROLES, MESSAGE_KINDS, SAVED_STATUSES, TASK_STATUSES, TASK_PRIORITIES,
  NOTIFICATION_TYPES, NOTIFICATION_CHANNELS, TIMELINE_EVENT_TYPES, DOCUMENT_SOURCE_TYPES,
  EMBEDDING_STATUSES, REVIEW_STATUSES, FEEDBACK_KINDS, FEEDBACK_STATUSES, AI_ENGINES,
  AI_REQUEST_TYPES, THEMES, NUMERAL_SYSTEMS, LIFE_EVENTS, INTENTS,
  SERVICE_LOCATION_TYPES, NID_VERIFICATION_STATUSES, RESIDENCY_VERIFICATION_METHODS,
  ISSUE_CATEGORIES, ISSUE_STATUSES, CIVIC_ROLES, LEDGER_ENTITY_TYPES, ESCALATION_STATUSES,
  BENEFICIARY_STATUSES, ENTITLEMENT_STATUSES, ENTITLEMENT_PERIODS, DISBURSEMENT_STATUSES,
  VISION_MODERATION_STATUSES,
} from '../domain/enums';
import type { RuleSet } from '../domain/rules';

/**
 * PRD §40 — "The database should use UUIDs for all primary keys."
 * Dialect is SQLite/libSQL rather than PostgreSQL; see docs/DEVIATIONS.md §1.
 * Column names are snake_case per PRD §85.
 */

const id = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date());
const updatedAt = () => integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date());

/* ======================================================================
   IDENTITY
   ====================================================================== */

export const users = sqliteTable(
  'users',
  {
    id: id(),
    /** Phone is the identity (BDS §10.2.11). Stored normalised: 01XXXXXXXXX. */
    phone: text('phone').notNull(),
    name: text('name').notNull(),
    /** Optional by design — many target users have no email they remember. */
    email: text('email'),
    /** 4–6 digit PIN, hashed. Never a "strong password" (BDS §10.2.11). */
    pinHash: text('pin_hash'),
    role: text('role', { enum: USER_ROLES }).notNull().default('citizen'),
    status: text('status', { enum: USER_STATUSES }).notNull().default('active'),
    language: text('language', { enum: ['bn', 'en'] }).notNull().default('bn'),
    district: text('district'),
    phoneVerifiedAt: integer('phone_verified_at', { mode: 'timestamp_ms' }),
    /** Consecutive failed PIN attempts; drives progressive delay, not lockout. */
    failedPinAttempts: integer('failed_pin_attempts').notNull().default(0),
    lockedUntil: integer('locked_until', { mode: 'timestamp_ms' }),
    lastLoginAt: integer('last_login_at', { mode: 'timestamp_ms' }),

    /**
     * Phase 3 civic titles (SJ-31–34). Orthogonal to `role`: a chairman is not
     * a platform "moderator" and vice versa. Assigned by an administrator via
     * /admin/civic-roles, never self-service. Exactly one of the three scope
     * columns is meaningful for a given civicRole (union_* -> civicUnionId;
     * upazila_officer -> civicUpazila; zila_officer -> civicDistrict).
     */
    civicRole: text('civic_role', { enum: CIVIC_ROLES }).notNull().default('none'),
    civicUnionId: text('civic_union_id').references(() => unionBoundaries.id, { onDelete: 'set null' }),
    civicUpazila: text('civic_upazila'),
    civicDistrict: text('civic_district'),

    /**
     * SJ-27 — a donor is not a civic title (it is not "senior" or "junior" to
     * a chairman, and holds no authority over any union), so it is its own
     * column rather than a fifth CIVIC_ROLES value. Presence of this FK is
     * what makes an account a donor representative; see modules/oversight.
     */
    donorOrgId: text('donor_org_id').references(() => donorOrganizations.id, { onDelete: 'set null' }),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('users_phone_uq').on(t.phone),
    index('users_role_idx').on(t.role),
    index('users_civic_idx').on(t.civicRole, t.civicUnionId),
    index('users_donor_idx').on(t.donorOrgId),
  ],
);

/**
 * PRD §21 — the dynamic profile. Every column is nullable: the profile grows
 * over the conversation and the engine must distinguish "false" from "not yet
 * asked". Nullable columns are what make three-valued eligibility possible.
 */
export const userProfiles = sqliteTable(
  'user_profiles',
  {
    id: id(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    dateOfBirth: integer('date_of_birth', { mode: 'timestamp_ms' }),
    /** Kept when the citizen states an age but not a birth date. */
    statedAge: integer('stated_age'),
    gender: text('gender', { enum: GENDERS }),
    occupation: text('occupation', { enum: OCCUPATIONS }),
    monthlyIncome: integer('monthly_income'),
    maritalStatus: text('marital_status', { enum: MARITAL_STATUSES }),
    education: text('education', { enum: EDUCATION_LEVELS }),
    cgpa: real('cgpa'),
    university: text('university'),
    department: text('department'),
    hasDisability: integer('has_disability', { mode: 'boolean' }),
    disabilityType: text('disability_type', { enum: DISABILITY_TYPES }),
    householdSize: integer('household_size'),
    dependents: integer('dependents'),
    division: text('division'),
    district: text('district'),
    upazila: text('upazila'),
    landOwnershipDecimals: real('land_ownership_decimals'),
    isStudent: integer('is_student', { mode: 'boolean' }),
    hasBusiness: integer('has_business', { mode: 'boolean' }),
    businessType: text('business_type'),
    employees: integer('employees'),
    farmSizeDecimals: real('farm_size_decimals'),
    crops: text('crops', { mode: 'json' }).$type<string[]>(),
    livestock: text('livestock', { mode: 'json' }).$type<string[]>(),
    isPregnant: integer('is_pregnant', { mode: 'boolean' }),
    /**
     * Health data is opt-in and user-controlled (PRD §68) AND, since SJ-44,
     * encrypted at rest (AES-256-GCM — see lib/security/field-encryption.ts).
     * The column stores an opaque ciphertext string, not a JSON array — hence
     * plain `text()`, not `{mode:'json'}`. Every read/write site decrypts or
     * encrypts explicitly; there is no transparent column-level codec in
     * Drizzle. The three call sites that touch this column directly are
     * lib/http/session.ts, modules/ai/conversation.service.ts, and
     * app/api/v1/users/profile/route.ts — see docs/DEVIATIONS.md §18.
     */
    medicalConditions: text('medical_conditions'),
    shareHealthData: integer('share_health_data', { mode: 'boolean' }).notNull().default(false),
    citizenship: text('citizenship').default('bangladeshi'),
    preferredCountry: text('preferred_country'),
    ieltsScore: real('ielts_score'),
    hasNid: integer('has_nid', { mode: 'boolean' }),
    hasBankAccount: integer('has_bank_account', { mode: 'boolean' }),
    isFreedomFighterFamily: integer('is_freedom_fighter_family', { mode: 'boolean' }),
    interests: text('interests', { mode: 'json' }).$type<string[]>(),

    /* ---- Phase 1: identity & residency verification (docs/DEVIATIONS.md) ---- */
    /** SHA-256 of the NID number, never the number itself (KB §5, §7). */
    nidNumberHash: text('nid_number_hash'),
    nidVerificationStatus: text('nid_verification_status', { enum: NID_VERIFICATION_STATUSES })
      .notNull().default('unverified'),
    nidVerifiedAt: integer('nid_verified_at', { mode: 'timestamp_ms' }),
    /** Set only once a GPS fix or manual pick has resolved a union boundary. */
    residencyUnionId: text('residency_union_id').references(() => unionBoundaries.id, { onDelete: 'set null' }),
    residencyVerificationMethod: text('residency_verification_method', { enum: RESIDENCY_VERIFICATION_METHODS }),
    residencyVerifiedAt: integer('residency_verified_at', { mode: 'timestamp_ms' }),
    /** The fix that produced the geofence match, kept for audit — not shown as a precise location. */
    residencyLat: real('residency_lat'),
    residencyLng: real('residency_lng'),
    /** Life events detected from conversation, with detection provenance. */
    lifeEvents: text('life_events', { mode: 'json' }).$type<
      { event: string; detectedAt: number; source: 'conversation' | 'profile' | 'manual' }[]
    >(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('user_profiles_user_uq').on(t.userId)],
);

export const userSettings = sqliteTable(
  'user_settings',
  {
    userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
    theme: text('theme', { enum: THEMES }).notNull().default('light'),
    /** BDS §4.6 in-app text size: 1 / 1.15 / 1.3 / 1.5. */
    textScale: real('text_scale').notNull().default(1),
    numeralSystem: text('numeral_system', { enum: NUMERAL_SYSTEMS }).notNull().default('latin'),
    reduceMotion: integer('reduce_motion', { mode: 'boolean' }).notNull().default(false),
    highContrast: integer('high_contrast', { mode: 'boolean' }).notNull().default(false),
    voiceEnabled: integer('voice_enabled', { mode: 'boolean' }).notNull().default(true),
    notifyPush: integer('notify_push', { mode: 'boolean' }).notNull().default(true),
    notifyEmail: integer('notify_email', { mode: 'boolean' }).notNull().default(false),
    notifySms: integer('notify_sms', { mode: 'boolean' }).notNull().default(false),
    notifyDeadlines: integer('notify_deadlines', { mode: 'boolean' }).notNull().default(true),
    notifyNewOpportunities: integer('notify_new_opportunities', { mode: 'boolean' }).notNull().default(true),
    notifyProgramUpdates: integer('notify_program_updates', { mode: 'boolean' }).notNull().default(true),
    profileVisibility: text('profile_visibility', { enum: ['private', 'anonymised_analytics'] })
      .notNull().default('anonymised_analytics'),
    updatedAt: updatedAt(),
  },
);

/** Refresh-token family. Rotation + reuse detection (PRD §43). */
export const sessions = sqliteTable(
  'sessions',
  {
    id: id(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    userAgent: text('user_agent'),
    ip: text('ip'),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
    /** Set when this token was rotated, so replay of the old one is detectable. */
    replacedById: text('replaced_by_id'),
    createdAt: createdAt(),
  },
  (t) => [index('sessions_user_idx').on(t.userId), index('sessions_hash_idx').on(t.refreshTokenHash)],
);

export const otpChallenges = sqliteTable(
  'otp_challenges',
  {
    id: id(),
    phone: text('phone').notNull(),
    codeHash: text('code_hash').notNull(),
    purpose: text('purpose', { enum: ['register', 'login', 'reset_pin', 'verify_phone'] }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    /** BDS §10.2.5 — at least 5 minutes; short expiry plus slow SMS is a
        systematic failure on congested networks. */
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    consumedAt: integer('consumed_at', { mode: 'timestamp_ms' }),
    /** Dev-only echo so the flow is completable without an SMS provider. */
    devCode: text('dev_code'),
    createdAt: createdAt(),
  },
  (t) => [index('otp_phone_idx').on(t.phone, t.purpose)],
);

/* ======================================================================
   KNOWLEDGE BASE
   ====================================================================== */

export const organizations = sqliteTable(
  'organizations',
  {
    id: id(),
    name: text('name').notNull(),
    nameBn: text('name_bn').notNull(),
    type: text('type', { enum: ORGANIZATION_TYPES }).notNull(),
    description: text('description').notNull(),
    descriptionBn: text('description_bn').notNull(),
    website: text('website'),
    contactPhone: text('contact_phone'),
    contactEmail: text('contact_email'),
    address: text('address'),
    addressBn: text('address_bn'),
    division: text('division'),
    district: text('district'),
    upazila: text('upazila'),
    lat: real('lat'),
    lng: real('lng'),
    officeHours: text('office_hours'),
    officeHoursBn: text('office_hours_bn'),
    /** Distinct from verificationStatus: does Shebar Janala vouch for the entity. */
    verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
    verificationStatus: text('verification_status', { enum: VERIFICATION_STATUSES })
      .notNull().default('unverified_sample'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('orgs_type_idx').on(t.type), index('orgs_district_idx').on(t.district)],
);

export const opportunities = sqliteTable(
  'opportunities',
  {
    id: id(),
    organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    titleBn: text('title_bn').notNull(),
    slug: text('slug').notNull(),
    category: text('category', { enum: OPPORTUNITY_CATEGORIES }).notNull(),
    summary: text('summary').notNull(),
    summaryBn: text('summary_bn').notNull(),
    description: text('description').notNull(),
    descriptionBn: text('description_bn').notNull(),
    benefits: text('benefits').notNull(),
    benefitsBn: text('benefits_bn').notNull(),
    /** In BDT. Rendered with two decimals and lakh/crore grouping (BDS §4.3). */
    benefitAmount: real('benefit_amount'),
    benefitPeriod: text('benefit_period', {
      enum: ['one_time', 'monthly', 'quarterly', 'half_yearly', 'yearly', 'per_course', 'variable'],
    }),
    applicationProcess: text('application_process', { mode: 'json' })
      .$type<{ step: number; en: string; bn: string }[]>().notNull(),
    /** Null means rolling/always open — distinct from an unknown deadline. */
    deadline: integer('deadline', { mode: 'timestamp_ms' }),
    /** Annual programmes reopen; drives proactive timeline entries. */
    recurrence: text('recurrence', { enum: ['none', 'annual', 'biannual', 'quarterly', 'continuous'] })
      .notNull().default('none'),
    status: text('status', { enum: OPPORTUNITY_STATUSES }).notNull().default('open'),
    /** Empty array = nationwide. Otherwise district codes. */
    coverageDistricts: text('coverage_districts', { mode: 'json' }).$type<string[]>().notNull(),
    officialUrl: text('official_url'),
    applyUrl: text('apply_url'),
    processingTimeDays: text('processing_time_days'),
    renewalMonths: integer('renewal_months'),
    /** Which life events surface this programme (PRD §23). */
    lifeEvents: text('life_events', { mode: 'json' }).$type<string[]>().notNull(),
    tags: text('tags', { mode: 'json' }).$type<string[]>().notNull(),
    /** Used by the 10% "popularity" ranking factor (PRD §31). */
    viewCount: integer('view_count').notNull().default(0),
    saveCount: integer('save_count').notNull().default(0),
    applicationCount: integer('application_count').notNull().default(0),

    /* ---- provenance (authored: PRD Part 7 is missing) ---- */
    verificationStatus: text('verification_status', { enum: VERIFICATION_STATUSES })
      .notNull().default('unverified_sample'),
    sourceUrl: text('source_url'),
    sourceNote: text('source_note'),
    lastVerifiedAt: integer('last_verified_at', { mode: 'timestamp_ms' }),
    verifiedBy: text('verified_by'),
    /** Re-verification cadence; feeds the staleness detector job. */
    reviewIntervalDays: integer('review_interval_days').notNull().default(180),
    version: integer('version').notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('opportunities_slug_uq').on(t.slug),
    index('opportunities_category_idx').on(t.category),
    index('opportunities_status_idx').on(t.status),
    index('opportunities_org_idx').on(t.organizationId),
    index('opportunities_deadline_idx').on(t.deadline),
  ],
);

export const eligibilityRules = sqliteTable(
  'eligibility_rules',
  {
    id: id(),
    opportunityId: text('opportunity_id').notNull().references(() => opportunities.id, { onDelete: 'cascade' }),
    ruleJson: text('rule_json', { mode: 'json' }).$type<RuleSet>().notNull(),
    priority: integer('priority').notNull().default(0),
    version: integer('version').notNull().default(1),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    /** Who wrote and who signed off — required before status can be verified. */
    authoredBy: text('authored_by'),
    reviewedBy: text('reviewed_by'),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp_ms' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('rules_opportunity_idx').on(t.opportunityId, t.active)],
);

export const requiredDocuments = sqliteTable(
  'required_documents',
  {
    id: id(),
    opportunityId: text('opportunity_id').notNull().references(() => opportunities.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    nameBn: text('name_bn').notNull(),
    required: integer('required', { mode: 'boolean' }).notNull().default(true),
    issuingAuthority: text('issuing_authority'),
    issuingAuthorityBn: text('issuing_authority_bn'),
    /** PRD §Feature 8 — "Common Mistakes" and "Preparation Tips". */
    commonMistake: text('common_mistake'),
    commonMistakeBn: text('common_mistake_bn'),
    tip: text('tip'),
    tipBn: text('tip_bn'),
    validityMonths: integer('validity_months'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('reqdocs_opportunity_idx').on(t.opportunityId)],
);

export const serviceLocations = sqliteTable(
  'service_locations',
  {
    id: id(),
    organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    nameBn: text('name_bn').notNull(),
    type: text('type', { enum: SERVICE_LOCATION_TYPES }).notNull(),
    address: text('address').notNull(),
    addressBn: text('address_bn').notNull(),
    division: text('division').notNull(),
    district: text('district').notNull(),
    upazila: text('upazila'),
    lat: real('lat').notNull(),
    lng: real('lng').notNull(),
    phone: text('phone'),
    officeHours: text('office_hours'),
    officeHoursBn: text('office_hours_bn'),
    services: text('services', { mode: 'json' }).$type<string[]>().notNull(),
    verificationStatus: text('verification_status', { enum: VERIFICATION_STATUSES })
      .notNull().default('unverified_sample'),
    createdAt: createdAt(),
  },
  (t) => [index('locations_district_idx').on(t.district), index('locations_type_idx').on(t.type)],
);

/**
 * Cached OpenStreetMap place lookups — real hospitals, police stations, courts.
 *
 * A cache, not a copy. Rows are keyed by the rounded search cell and expire, so
 * the app never becomes a stale mirror of OSM: an office that closes disappears
 * from here within the TTL rather than being served indefinitely.
 *
 * It exists because Overpass is a **volunteer-run shared service** with an
 * explicit fair-use policy. Querying it on every page view would be both abusive
 * and unusable — a cold Overpass query takes several seconds, which is far past
 * the point where a citizen on 2G concludes the screen is broken. So the first
 * visitor to an area pays that cost once and everyone after reads from SQLite.
 *
 * The payload is stored whole rather than exploded into columns. It is upstream
 * data with no schema guarantees, and normalising it would mean silently
 * discarding tags on the way in — then being unable to add a feature later
 * without re-fetching everything.
 */
export const osmPlaceCache = sqliteTable(
  'osm_place_cache',
  {
    id: id(),
    /**
     * `{latCell}:{lngCell}:{radiusKm}` — coordinates rounded to a fixed grid.
     *
     * Rounding is what makes the cache useful. Keying on exact GPS coordinates
     * would give every citizen their own miss, so two people in the same town
     * would each trigger a separate upstream query for identical results.
     */
    cellKey: text('cell_key').notNull(),
    /** Bounding box actually searched, kept so a stored result is auditable. */
    south: real('south').notNull(),
    west: real('west').notNull(),
    north: real('north').notNull(),
    east: real('east').notNull(),
    /** The normalised places, as returned to the client. */
    payload: text('payload', { mode: 'json' }).$type<unknown[]>().notNull(),
    placeCount: integer('place_count').notNull().default(0),
    fetchedAt: integer('fetched_at', { mode: 'timestamp_ms' }).notNull(),
    /** Which endpoint served it, so a bad mirror can be identified later. */
    sourceUrl: text('source_url').notNull(),
  },
  (t) => [uniqueIndex('osm_cache_cell_idx').on(t.cellKey)],
);

/** Source documents behind the knowledge base — PRD §Feature 19 evidence. */
export const documents = sqliteTable(
  'documents',
  {
    id: id(),
    opportunityId: text('opportunity_id').references(() => opportunities.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    titleBn: text('title_bn'),
    sourceType: text('source_type', { enum: DOCUMENT_SOURCE_TYPES }).notNull(),
    /** Where the citizen can read the original. */
    sourceUrl: text('source_url'),
    /** Local/object-storage copy, when we are permitted to hold one. */
    fileUrl: text('file_url'),
    publisher: text('publisher'),
    publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
    retrievedAt: integer('retrieved_at', { mode: 'timestamp_ms' }),
    /** Change detection for the daily sync job. */
    checksum: text('checksum'),
    version: integer('version').notNull().default(1),
    /** Redistribution position — a real constraint for government circulars. */
    licenseNote: text('license_note'),
    textContent: text('text_content'),
    embeddingStatus: text('embedding_status', { enum: EMBEDDING_STATUSES }).notNull().default('pending'),
    verificationStatus: text('verification_status', { enum: VERIFICATION_STATUSES })
      .notNull().default('unverified_sample'),
    /** Set by the staleness job when retrievedAt exceeds the review interval. */
    stale: integer('stale', { mode: 'boolean' }).notNull().default(false),
    deadLink: integer('dead_link', { mode: 'boolean' }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('documents_opportunity_idx').on(t.opportunityId),
    index('documents_embedding_idx').on(t.embeddingStatus),
  ],
);

/**
 * Retrieval index. PRD §37 specifies pgvector; here the vector is a JSON
 * float array scored in-process, and lexical retrieval uses the token stats
 * below. Interface-compatible with a pgvector swap (docs/DEVIATIONS.md §3).
 */
export const documentChunks = sqliteTable(
  'document_chunks',
  {
    id: id(),
    documentId: text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
    opportunityId: text('opportunity_id').references(() => opportunities.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    contentBn: text('content_bn'),
    tokenCount: integer('token_count').notNull().default(0),
    /** Null when no embedding provider is configured. */
    embedding: text('embedding', { mode: 'json' }).$type<number[]>(),
    embeddingModel: text('embedding_model'),
    /** Pre-computed lexical term frequencies for BM25 without a scan. */
    termFrequencies: text('term_frequencies', { mode: 'json' }).$type<Record<string, number>>(),
    metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [
    index('chunks_document_idx').on(t.documentId),
    uniqueIndex('chunks_doc_index_uq').on(t.documentId, t.chunkIndex),
  ],
);

/** PRD §27 — explicit relationships enabling indirect discovery. */
export const knowledgeGraphEdges = sqliteTable(
  'knowledge_graph_edges',
  {
    id: id(),
    fromType: text('from_type', { enum: ['life_event', 'opportunity', 'organization', 'category', 'persona'] }).notNull(),
    fromId: text('from_id').notNull(),
    relation: text('relation', {
      enum: ['triggers', 'requires', 'complements', 'succeeds', 'offered_by', 'belongs_to', 'alternative_to'],
    }).notNull(),
    toType: text('to_type', { enum: ['life_event', 'opportunity', 'organization', 'category', 'persona'] }).notNull(),
    toId: text('to_id').notNull(),
    weight: real('weight').notNull().default(1),
    note: text('note'),
  },
  (t) => [
    index('kg_from_idx').on(t.fromType, t.fromId),
    index('kg_to_idx').on(t.toType, t.toId),
  ],
);

export const lifeEventCatalog = sqliteTable('life_event_catalog', {
  code: text('code', { enum: LIFE_EVENTS }).primaryKey(),
  label: text('label').notNull(),
  labelBn: text('label_bn').notNull(),
  description: text('description').notNull(),
  descriptionBn: text('description_bn').notNull(),
  /** Bangla + English + Banglish surface forms for the detector. */
  keywords: text('keywords', { mode: 'json' }).$type<string[]>().notNull(),
  icon: text('icon').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

/* ======================================================================
   CONVERSATION
   ====================================================================== */

export const conversations = sqliteTable(
  'conversations',
  {
    id: id(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title'),
    summary: text('summary'),
    language: text('language', { enum: ['bn', 'en'] }).notNull().default('bn'),
    messageCount: integer('message_count').notNull().default(0),
    startedAt: createdAt(),
    lastMessageAt: integer('last_message_at', { mode: 'timestamp_ms' }),
    endedAt: integer('ended_at', { mode: 'timestamp_ms' }),
  },
  (t) => [index('conversations_user_idx').on(t.userId, t.lastMessageAt)],
);

export const messages = sqliteTable(
  'messages',
  {
    id: id(),
    conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
    role: text('role', { enum: MESSAGE_ROLES }).notNull(),
    kind: text('kind', { enum: MESSAGE_KINDS }).notNull().default('text'),
    content: text('content').notNull(),
    /** Structured payload for recommendation / action-plan / eligibility cards. */
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
    tokens: integer('tokens').notNull().default(0),
    latencyMs: integer('latency_ms'),
    aiEngine: text('ai_engine', { enum: AI_ENGINES }),
    confidence: integer('confidence'),
    createdAt: createdAt(),
  },
  (t) => [index('messages_conversation_idx').on(t.conversationId, t.createdAt)],
);

/* ======================================================================
   CITIZEN ACTIVITY
   ====================================================================== */

export const savedOpportunities = sqliteTable(
  'saved_opportunities',
  {
    id: id(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    opportunityId: text('opportunity_id').notNull().references(() => opportunities.id, { onDelete: 'cascade' }),
    status: text('status', { enum: SAVED_STATUSES }).notNull().default('interested'),
    note: text('note'),
    savedAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('saved_user_opp_uq').on(t.userId, t.opportunityId)],
);

/** Status transitions are auditable — PRD §18 tracker + §121 admin logging. */
export const savedStatusHistory = sqliteTable(
  'saved_status_history',
  {
    id: id(),
    savedId: text('saved_id').notNull().references(() => savedOpportunities.id, { onDelete: 'cascade' }),
    fromStatus: text('from_status', { enum: SAVED_STATUSES }),
    toStatus: text('to_status', { enum: SAVED_STATUSES }).notNull(),
    changedAt: createdAt(),
  },
  (t) => [index('saved_history_idx').on(t.savedId)],
);

export const actionPlans = sqliteTable(
  'action_plans',
  {
    id: id(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    opportunityId: text('opportunity_id').notNull().references(() => opportunities.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    titleBn: text('title_bn').notNull(),
    status: text('status', { enum: ['active', 'completed', 'abandoned'] }).notNull().default('active'),
    generatedBy: text('generated_by', { enum: AI_ENGINES }).notNull().default('simulated'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('plans_user_idx').on(t.userId),
    uniqueIndex('plans_user_opp_uq').on(t.userId, t.opportunityId),
  ],
);

export const actionPlanTasks = sqliteTable(
  'action_plan_tasks',
  {
    id: id(),
    planId: text('plan_id').notNull().references(() => actionPlans.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    titleBn: text('title_bn').notNull(),
    description: text('description'),
    descriptionBn: text('description_bn'),
    dueDate: integer('due_date', { mode: 'timestamp_ms' }),
    priority: text('priority', { enum: TASK_PRIORITIES }).notNull().default('medium'),
    estimatedMinutes: integer('estimated_minutes'),
    status: text('status', { enum: TASK_STATUSES }).notNull().default('pending'),
    notes: text('notes'),
    sortOrder: integer('sort_order').notNull().default(0),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  },
  (t) => [index('tasks_plan_idx').on(t.planId, t.sortOrder)],
);

export const timelineEvents = sqliteTable(
  'timeline_events',
  {
    id: id(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    opportunityId: text('opportunity_id').references(() => opportunities.id, { onDelete: 'set null' }),
    taskId: text('task_id').references(() => actionPlanTasks.id, { onDelete: 'cascade' }),
    type: text('type', { enum: TIMELINE_EVENT_TYPES }).notNull(),
    title: text('title').notNull(),
    titleBn: text('title_bn').notNull(),
    description: text('description'),
    descriptionBn: text('description_bn'),
    eventDate: integer('event_date', { mode: 'timestamp_ms' }).notNull(),
    /** System-generated entries are regenerated; manual ones are preserved. */
    source: text('source', { enum: ['system', 'manual'] }).notNull().default('system'),
    completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index('timeline_user_date_idx').on(t.userId, t.eventDate)],
);

export const notifications = sqliteTable(
  'notifications',
  {
    id: id(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    titleBn: text('title_bn').notNull(),
    body: text('body').notNull(),
    bodyBn: text('body_bn').notNull(),
    type: text('type', { enum: NOTIFICATION_TYPES }).notNull(),
    channel: text('channel', { enum: NOTIFICATION_CHANNELS }).notNull().default('in_app'),
    actionUrl: text('action_url'),
    read: integer('read', { mode: 'boolean' }).notNull().default(false),
    scheduledAt: integer('scheduled_at', { mode: 'timestamp_ms' }),
    sentAt: integer('sent_at', { mode: 'timestamp_ms' }),
    createdAt: createdAt(),
  },
  (t) => [index('notifications_user_idx').on(t.userId, t.read, t.createdAt)],
);

/* ======================================================================
   CIVIC — SHEBAR JANALA PHASES 1–2
   ====================================================================== */

/**
 * Union Parishad boundaries, for residency verification and issue scoping.
 *
 * Polygon geometry here is AUTHORED SAMPLE DATA — illustrative boundaries for
 * a handful of unions, not surveyed ones (docs/DEVIATIONS.md). Reusing
 * `VERIFICATION_STATUSES` is deliberate: the same reason the knowledge base
 * marks a programme `unverified_sample` applies here — an invented boundary
 * must never look like a surveyed one to a citizen deciding where they live.
 */
export const unionBoundaries = sqliteTable(
  'union_boundaries',
  {
    id: id(),
    unionCode: text('union_code').notNull(),
    name: text('name').notNull(),
    nameBn: text('name_bn').notNull(),
    division: text('division').notNull(),
    district: text('district').notNull(),
    upazila: text('upazila').notNull(),
    centroidLat: real('centroid_lat').notNull(),
    centroidLng: real('centroid_lng').notNull(),
    /** Closed ring of `[lat, lng]` points, at least 3, authored by hand. */
    polygon: text('polygon', { mode: 'json' }).$type<[number, number][]>().notNull(),
    verificationStatus: text('verification_status', { enum: VERIFICATION_STATUSES })
      .notNull().default('unverified_sample'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('union_code_uq').on(t.unionCode), index('union_district_idx').on(t.district)],
);

/**
 * A citizen-reported local problem — the "Amar Union, Amar Sheba" module.
 *
 * `unionId` is resolved once, at submission time, from the reporter's own
 * verified residency (never re-derived from the pinned lat/lng), so a report
 * cannot be scoped to a union the citizen was never confirmed to live in.
 */
export const issues = sqliteTable(
  'issues',
  {
    id: id(),
    reporterId: text('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    unionId: text('union_id').notNull().references(() => unionBoundaries.id, { onDelete: 'restrict' }),
    category: text('category', { enum: ISSUE_CATEGORIES }).notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    lat: real('lat').notNull(),
    lng: real('lng').notNull(),
    /** Local path under `/uploads/issues/…` — see modules/issues/photo-storage.ts. */
    photoUrl: text('photo_url'),
    status: text('status', { enum: ISSUE_STATUSES }).notNull().default('under_review'),
    /** Deterministic keyword-filter result — a signal for the queue, never a verdict (BRD BR-1). */
    autoFlagged: integer('auto_flagged', { mode: 'boolean' }).notNull().default(false),
    autoFlagReason: text('auto_flag_reason'),
    /**
     * SJ-21 — recorded separately from `autoFlagged`/`autoFlagReason` (which
     * vision moderation also sets, so the existing moderation queue needs no
     * changes) purely so the audit trail shows WHICH check ran: a real vision
     * call that passed, one that flagged, or "no vision provider configured"
     * — never silently indistinguishable from "never checked". See
     * modules/issues/vision-moderation.ts.
     */
    visionModerationStatus: text('vision_moderation_status', { enum: VISION_MODERATION_STATUSES })
      .notNull().default('not_applicable'),
    moderatedBy: text('moderated_by'),
    moderationNote: text('moderation_note'),
    resolvedBy: text('resolved_by'),
    resolutionNote: text('resolution_note'),
    resolutionPhotoUrl: text('resolution_photo_url'),
    voteCount: integer('vote_count').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
  },
  (t) => [
    index('issues_union_status_idx').on(t.unionId, t.status),
    index('issues_reporter_idx').on(t.reporterId),
  ],
);

/** One endorsement per verified resident per issue (BRD FR-4). */
export const issueVotes = sqliteTable(
  'issue_votes',
  {
    id: id(),
    issueId: text('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('issue_votes_uq').on(t.issueId, t.userId)],
);

/** Every status transition, auditable — the same pattern as `saved_status_history`. */
export const issueStatusHistory = sqliteTable(
  'issue_status_history',
  {
    id: id(),
    issueId: text('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
    fromStatus: text('from_status', { enum: ISSUE_STATUSES }),
    toStatus: text('to_status', { enum: ISSUE_STATUSES }).notNull(),
    changedBy: text('changed_by'),
    note: text('note'),
    changedAt: createdAt(),
  },
  (t) => [index('issue_history_idx').on(t.issueId)],
);

export const issuesRelations = relations(issues, ({ one, many }) => ({
  reporter: one(users, { fields: [issues.reporterId], references: [users.id] }),
  union: one(unionBoundaries, { fields: [issues.unionId], references: [unionBoundaries.id] }),
  votes: many(issueVotes),
}));

/* ======================================================================
   CIVIC — SHEBAR JANALA PHASE 3: LEDGER & ACCOUNTABILITY
   ====================================================================== */

/**
 * The tamper-evident chain for financial records (SJ-13/SJ-14's BRD ERD
 * "LedgerEntry"), kept deliberately separate from `audit_log`: this one
 * anchors specifically budget allocations and disbursements, and nothing
 * else ever writes to it. Same hash-chain discipline as `audit_log` — see
 * modules/ledger/hash-chain.ts for the shared, tested implementation both
 * use, and docs/DEVIATIONS.md for what "tamper-evident" does and does not
 * mean here (a hash chain in one database, not a distributed ledger).
 */
export const ledgerEntries = sqliteTable(
  'ledger_entries',
  {
    id: id(),
    entityType: text('entity_type', { enum: LEDGER_ENTITY_TYPES }).notNull(),
    entityId: text('entity_id').notNull(),
    /** The exact fields hashed — kept alongside the hash so a verifier needs no other table. */
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
    prevHash: text('prev_hash').notNull(),
    entryHash: text('entry_hash').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('ledger_entry_hash_uq').on(t.entryHash),
    uniqueIndex('ledger_prev_hash_uq').on(t.prevHash),
    index('ledger_entity_idx').on(t.entityType, t.entityId),
  ],
);

/** SJ-12 — a chairman's (or union staff's) posted budget line item. */
export const budgetAllocations = sqliteTable(
  'budget_allocations',
  {
    id: id(),
    unionId: text('union_id').notNull().references(() => unionBoundaries.id, { onDelete: 'restrict' }),
    postedBy: text('posted_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
    projectName: text('project_name').notNull(),
    description: text('description').notNull(),
    /** In BDT. */
    amount: real('amount').notNull(),
    allocationDate: integer('allocation_date', { mode: 'timestamp_ms' }).notNull(),
    /** Denormalised for cheap listing; the source of truth is `allocation_flags`. */
    flagCount: integer('flag_count').notNull().default(0),
    /** Set once, the first time the threshold is crossed — see escalations. */
    escalated: integer('escalated', { mode: 'boolean' }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('allocations_union_idx').on(t.unionId, t.createdAt)],
);

/** SJ-16 — one flag per verified resident per allocation. */
export const allocationFlags = sqliteTable(
  'allocation_flags',
  {
    id: id(),
    allocationId: text('allocation_id').notNull().references(() => budgetAllocations.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    reason: text('reason'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('allocation_flags_uq').on(t.allocationId, t.userId)],
);

/**
 * SJ-17/18 — the record of one threshold breach, and whether the officer it
 * reached has acted on it. `upazilaOfficerId` is nullable on purpose: if no
 * officer is yet assigned to the union's upazila, the escalation is still
 * recorded — honestly unassigned — rather than silently dropped.
 */
export const escalations = sqliteTable(
  'escalations',
  {
    id: id(),
    allocationId: text('allocation_id').notNull().references(() => budgetAllocations.id, { onDelete: 'cascade' }),
    upazilaOfficerId: text('upazila_officer_id').references(() => users.id, { onDelete: 'set null' }),
    flagCount: integer('flag_count').notNull(),
    verifiedResidentCount: integer('verified_resident_count').notNull(),
    ratio: real('ratio').notNull(),
    status: text('status', { enum: ESCALATION_STATUSES }).notNull().default('pending'),
    note: text('note'),
    createdAt: createdAt(),
    resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
  },
  // One escalation per allocation — a rising ratio does not re-notify.
  (t) => [uniqueIndex('escalations_allocation_uq').on(t.allocationId), index('escalations_officer_idx').on(t.upazilaOfficerId, t.status)],
);

/**
 * SJ-14/15 — the BRD's ERD, adapted: a beneficiary is identified by NID
 * hash (never the raw number), so `checkMyEntitlementStatus` can match a
 * citizen to their own enrolment without a second identity system. `userId`
 * is nullable because a beneficiary can be enrolled before they ever create
 * a Shebar Janala account.
 */
export const beneficiaries = sqliteTable(
  'beneficiaries',
  {
    id: id(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    nidHash: text('nid_hash').notNull(),
    unionId: text('union_id').notNull().references(() => unionBoundaries.id, { onDelete: 'restrict' }),
    programCode: text('program_code').notNull(),
    programName: text('program_name').notNull(),
    programNameBn: text('program_name_bn').notNull(),
    status: text('status', { enum: BENEFICIARY_STATUSES }).notNull().default('active'),
    enrolledBy: text('enrolled_by').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('beneficiaries_nid_idx').on(t.nidHash), index('beneficiaries_union_idx').on(t.unionId)],
);

export const entitlements = sqliteTable(
  'entitlements',
  {
    id: id(),
    beneficiaryId: text('beneficiary_id').notNull().references(() => beneficiaries.id, { onDelete: 'cascade' }),
    amount: real('amount').notNull(),
    period: text('period', { enum: ENTITLEMENT_PERIODS }).notNull(),
    status: text('status', { enum: ENTITLEMENT_STATUSES }).notNull().default('active'),
    createdAt: createdAt(),
  },
  (t) => [index('entitlements_beneficiary_idx').on(t.beneficiaryId)],
);

/** Anchored into `ledger_entries` on every insert — this is the disbursement half of SJ-14's ERD. */
export const disbursements = sqliteTable(
  'disbursements',
  {
    id: id(),
    entitlementId: text('entitlement_id').notNull().references(() => entitlements.id, { onDelete: 'cascade' }),
    amount: real('amount').notNull(),
    scheduledFor: integer('scheduled_for', { mode: 'timestamp_ms' }).notNull(),
    paidAt: integer('paid_at', { mode: 'timestamp_ms' }),
    status: text('status', { enum: DISBURSEMENT_STATUSES }).notNull().default('scheduled'),
    recordedBy: text('recorded_by').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('disbursements_entitlement_idx').on(t.entitlementId)],
);

export const budgetAllocationsRelations = relations(budgetAllocations, ({ one, many }) => ({
  union: one(unionBoundaries, { fields: [budgetAllocations.unionId], references: [unionBoundaries.id] }),
  poster: one(users, { fields: [budgetAllocations.postedBy], references: [users.id] }),
  flags: many(allocationFlags),
}));

export const beneficiariesRelations = relations(beneficiaries, ({ many }) => ({
  entitlements: many(entitlements),
}));

export const entitlementsRelations = relations(entitlements, ({ one, many }) => ({
  beneficiary: one(beneficiaries, { fields: [entitlements.beneficiaryId], references: [beneficiaries.id] }),
  disbursements: many(disbursements),
}));

/* ======================================================================
   CIVIC — SHEBAR JANALA PHASE 4/5: OVERSIGHT, REACH
   ====================================================================== */

/**
 * SJ-27 — an external funder (NGO, UNDP, a donor agency), never a citizen or
 * a civic official. Kept deliberately thin: the entity a donor portal is
 * ultimately about is `donorFundingScopes`, not this row.
 */
export const donorOrganizations = sqliteTable(
  'donor_organizations',
  {
    id: id(),
    name: text('name').notNull(),
    nameBn: text('name_bn').notNull(),
    description: text('description'),
    createdAt: createdAt(),
  },
);

/**
 * What a donor org actually funds — a program code, not a blank cheque over
 * the whole ledger. SJ-27's exit criterion ("scoped to what a donor is
 * actually funding") is enforced by scoping every donor-portal query to the
 * program codes listed here for that org, exactly as a civic role is scoped
 * to a union/upazila/district rather than trusted by rank alone.
 */
export const donorFundingScopes = sqliteTable(
  'donor_funding_scopes',
  {
    id: id(),
    donorOrgId: text('donor_org_id').notNull().references(() => donorOrganizations.id, { onDelete: 'cascade' }),
    /** Matches `beneficiaries.programCode` — never a free-text label. */
    programCode: text('program_code').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('donor_scope_uq').on(t.donorOrgId, t.programCode)],
);

export const donorOrganizationsRelations = relations(donorOrganizations, ({ many }) => ({
  scopes: many(donorFundingScopes),
  representatives: many(users),
}));

/**
 * SJ-23/48 — one row per live USSD session. A USSD aggregator calls back on
 * every keypress with the SAME `sessionId` and the FULL text typed so far
 * (not just the latest digit), so the server must remember which step a
 * session is on between requests — unlike every other route in this app,
 * which is stateless. Short-lived by nature (a session times out in the
 * telecom network after ~90s of inactivity); nothing here needs the
 * retention job to sweep it, expired rows are simply never read again, but
 * old ones are still purged periodically to keep the table small.
 */
export const ussdSessions = sqliteTable(
  'ussd_sessions',
  {
    id: id(),
    sessionId: text('session_id').notNull(),
    phone: text('phone').notNull(),
    step: text('step').notNull().default('menu'),
    context: text('context', { mode: 'json' }).$type<Record<string, unknown>>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('ussd_session_uq').on(t.sessionId)],
);

/**
 * SJ-23/48's demo aid, nothing more: `SMS_PROVIDER=demo` writes here instead
 * of a real vendor call, so a staff member can open /admin/sms-outbox in a
 * second browser tab and show "the text that arrived on the phone" during a
 * live demo. Staff-only to view (see the API route) — an OTP is exactly the
 * kind of thing this table must never expose to an unauthenticated visitor,
 * demo or not. Never written to when a real provider is configured.
 */
export const demoSmsOutbox = sqliteTable('demo_sms_outbox', {
  id: id(),
  phone: text('phone').notNull(),
  body: text('body').notNull(),
  createdAt: createdAt(),
});

/* ======================================================================
   AI OPERATIONS & GOVERNANCE
   ====================================================================== */

/**
 * Every eligibility decision is stored with the profile snapshot and rule
 * version that produced it. Without this, "why did it say I qualified last
 * week?" is unanswerable and the Trust Dashboard is decorative.
 */
export const eligibilityEvaluations = sqliteTable(
  'eligibility_evaluations',
  {
    id: id(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    opportunityId: text('opportunity_id').notNull().references(() => opportunities.id, { onDelete: 'cascade' }),
    outcome: text('outcome', { enum: ELIGIBILITY_OUTCOMES }).notNull(),
    matchedCount: integer('matched_count').notNull().default(0),
    failedCount: integer('failed_count').notNull().default(0),
    unknownCount: integer('unknown_count').notNull().default(0),
    confidence: integer('confidence').notNull().default(0),
    /** Full per-condition trace, rendered verbatim by the explanation UI. */
    detail: text('detail', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
    profileSnapshot: text('profile_snapshot', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
    ruleVersion: integer('rule_version').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('evals_user_idx').on(t.userId, t.createdAt), index('evals_opp_idx').on(t.opportunityId)],
);

export const aiLogs = sqliteTable(
  'ai_logs',
  {
    id: id(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    conversationId: text('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }),
    messageId: text('message_id'),
    requestType: text('request_type', { enum: AI_REQUEST_TYPES }).notNull(),
    engine: text('engine', { enum: AI_ENGINES }).notNull(),
    model: text('model'),
    promptTemplate: text('prompt_template'),
    promptVersion: text('prompt_version'),
    inputSummary: text('input_summary'),
    outputSummary: text('output_summary'),
    intents: text('intents', { mode: 'json' }).$type<string[]>(),
    entities: text('entities', { mode: 'json' }).$type<Record<string, unknown>>(),
    retrievedChunkIds: text('retrieved_chunk_ids', { mode: 'json' }).$type<string[]>(),
    citedOpportunityIds: text('cited_opportunity_ids', { mode: 'json' }).$type<string[]>(),
    confidence: integer('confidence'),
    latencyMs: integer('latency_ms'),
    tokensIn: integer('tokens_in'),
    tokensOut: integer('tokens_out'),
    /** Set when a claim could not be traced to retrieved evidence (PRD §35). */
    groundingFailure: integer('grounding_failure', { mode: 'boolean' }).notNull().default(false),
    error: text('error'),
    createdAt: createdAt(),
  },
  (t) => [index('ai_logs_created_idx').on(t.createdAt), index('ai_logs_type_idx').on(t.requestType)],
);

export const feedback = sqliteTable(
  'feedback',
  {
    id: id(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    messageId: text('message_id').references(() => messages.id, { onDelete: 'cascade' }),
    opportunityId: text('opportunity_id').references(() => opportunities.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: FEEDBACK_KINDS }).notNull(),
    rating: integer('rating'),
    comment: text('comment'),
    /** PRD §34 — feedback NEVER auto-changes rules; a human decides. */
    status: text('status', { enum: FEEDBACK_STATUSES }).notNull().default('new'),
    reviewedBy: text('reviewed_by'),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp_ms' }),
    reviewerNote: text('reviewer_note'),
    createdAt: createdAt(),
  },
  (t) => [index('feedback_status_idx').on(t.status, t.createdAt)],
);

/** Part 7 verification workflow — nothing becomes `verified` without a review. */
export const knowledgeReviews = sqliteTable(
  'knowledge_reviews',
  {
    id: id(),
    entityType: text('entity_type', { enum: ['opportunity', 'eligibility_rule', 'organization', 'document', 'location'] }).notNull(),
    entityId: text('entity_id').notNull(),
    submittedBy: text('submitted_by').notNull(),
    reviewerId: text('reviewer_id'),
    status: text('status', { enum: REVIEW_STATUSES }).notNull().default('pending'),
    note: text('note'),
    /** Proposed change, applied only on approval. */
    proposedPatch: text('proposed_patch', { mode: 'json' }).$type<Record<string, unknown>>(),
    createdAt: createdAt(),
    decidedAt: integer('decided_at', { mode: 'timestamp_ms' }),
  },
  (t) => [index('reviews_status_idx').on(t.status), index('reviews_entity_idx').on(t.entityType, t.entityId)],
);

/**
 * PRD §121 — "Log administrative actions." Append-only, and since Phase 3
 * (SJ-13) genuinely tamper-evident: `entryHash` folds in `prevHash`, so
 * altering a stored row's contents after the fact makes it stop matching its
 * own hash, and altering `prevHash` breaks the link to the row before it —
 * either way `verifyAuditChain()` (modules/admin/admin.service.ts) detects
 * exactly where. Rows written before this column existed have a null hash
 * and are outside the chain; the chain begins at the first row written after
 * this migration. See docs/DEVIATIONS.md for the single-writer caveat this
 * accepts.
 */
export const auditLog = sqliteTable(
  'audit_log',
  {
    id: id(),
    actorId: text('actor_id'),
    actorRole: text('actor_role', { enum: USER_ROLES }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    before: text('before', { mode: 'json' }).$type<Record<string, unknown>>(),
    after: text('after', { mode: 'json' }).$type<Record<string, unknown>>(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    /** Hash of the previous chained row, or the GENESIS constant for the first. */
    prevHash: text('prev_hash'),
    /** sha256(prevHash + stable-serialised payload). Recomputable, never edited. */
    entryHash: text('entry_hash'),
    createdAt: createdAt(),
  },
  (t) => [
    index('audit_created_idx').on(t.createdAt),
    index('audit_entity_idx').on(t.entityType, t.entityId),
    uniqueIndex('audit_prev_hash_uq').on(t.prevHash),
  ],
);

export const searchQueries = sqliteTable(
  'search_queries',
  {
    id: id(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    query: text('query').notNull(),
    locale: text('locale', { enum: ['bn', 'en'] }).notNull(),
    intents: text('intents', { mode: 'json' }).$type<string[]>(),
    resultCount: integer('result_count').notNull().default(0),
    clickedOpportunityId: text('clicked_opportunity_id'),
    createdAt: createdAt(),
  },
  (t) => [index('search_created_idx').on(t.createdAt)],
);

/** PRD §45 — background job bookkeeping, surfaced in Admin → System Health. */
export const jobRuns = sqliteTable(
  'job_runs',
  {
    id: id(),
    job: text('job').notNull(),
    status: text('status', { enum: ['running', 'succeeded', 'failed'] }).notNull(),
    startedAt: createdAt(),
    finishedAt: integer('finished_at', { mode: 'timestamp_ms' }),
    processed: integer('processed').notNull().default(0),
    failed: integer('failed').notNull().default(0),
    detail: text('detail', { mode: 'json' }).$type<Record<string, unknown>>(),
  },
  (t) => [index('jobs_job_idx').on(t.job, t.startedAt)],
);

/** Daily rollup for the analytics dashboard (PRD §78). */
export const analyticsDaily = sqliteTable(
  'analytics_daily',
  {
    day: text('day').primaryKey(),
    activeUsers: integer('active_users').notNull().default(0),
    newUsers: integer('new_users').notNull().default(0),
    conversations: integer('conversations').notNull().default(0),
    recommendations: integer('recommendations').notNull().default(0),
    saves: integer('saves').notNull().default(0),
    applicationsStarted: integer('applications_started').notNull().default(0),
    completedActionPlans: integer('completed_action_plans').notNull().default(0),
    searches: integer('searches').notNull().default(0),
    avgLatencyMs: integer('avg_latency_ms').notNull().default(0),
    citationCoverage: real('citation_coverage').notNull().default(0),
    groundingFailureRate: real('grounding_failure_rate').notNull().default(0),
    satisfactionScore: real('satisfaction_score').notNull().default(0),
  },
);

/** Anonymous rate limiting + abuse control without Redis (PRD §48). */
export const rateLimitBuckets = sqliteTable(
  'rate_limit_buckets',
  {
    key: text('key').primaryKey(),
    tokens: real('tokens').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
);

/* ======================================================================
   RELATIONS
   ====================================================================== */

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, { fields: [users.id], references: [userProfiles.userId] }),
  settings: one(userSettings, { fields: [users.id], references: [userSettings.userId] }),
  conversations: many(conversations),
  saved: many(savedOpportunities),
  notifications: many(notifications),
  plans: many(actionPlans),
  donorOrg: one(donorOrganizations, { fields: [users.donorOrgId], references: [donorOrganizations.id] }),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  opportunities: many(opportunities),
  locations: many(serviceLocations),
}));

export const opportunitiesRelations = relations(opportunities, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [opportunities.organizationId],
    references: [organizations.id],
  }),
  rules: many(eligibilityRules),
  requiredDocuments: many(requiredDocuments),
  documents: many(documents),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const actionPlansRelations = relations(actionPlans, ({ one, many }) => ({
  opportunity: one(opportunities, {
    fields: [actionPlans.opportunityId],
    references: [opportunities.id],
  }),
  tasks: many(actionPlanTasks),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  opportunity: one(opportunities, {
    fields: [documents.opportunityId],
    references: [opportunities.id],
  }),
  chunks: many(documentChunks),
}));

/* ======================================================================
   INFERRED TYPES — services and UI use these, never raw row shapes.
   ====================================================================== */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type OtpChallenge = typeof otpChallenges.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Opportunity = typeof opportunities.$inferSelect;
export type NewOpportunity = typeof opportunities.$inferInsert;
export type EligibilityRuleRow = typeof eligibilityRules.$inferSelect;
export type RequiredDocument = typeof requiredDocuments.$inferSelect;
export type ServiceLocation = typeof serviceLocations.$inferSelect;
export type KnowledgeDocument = typeof documents.$inferSelect;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type KnowledgeGraphEdge = typeof knowledgeGraphEdges.$inferSelect;
export type LifeEventCatalogRow = typeof lifeEventCatalog.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type SavedOpportunity = typeof savedOpportunities.$inferSelect;
export type ActionPlan = typeof actionPlans.$inferSelect;
export type ActionPlanTask = typeof actionPlanTasks.$inferSelect;
export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type EligibilityEvaluation = typeof eligibilityEvaluations.$inferSelect;
export type AiLog = typeof aiLogs.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type KnowledgeReview = typeof knowledgeReviews.$inferSelect;
export type AuditLogRow = typeof auditLog.$inferSelect;
export type JobRun = typeof jobRuns.$inferSelect;
export type AnalyticsDaily = typeof analyticsDaily.$inferSelect;
export type UnionBoundary = typeof unionBoundaries.$inferSelect;
export type NewUnionBoundary = typeof unionBoundaries.$inferInsert;
export type Issue = typeof issues.$inferSelect;
export type NewIssue = typeof issues.$inferInsert;
export type IssueVote = typeof issueVotes.$inferSelect;
export type IssueStatusHistoryRow = typeof issueStatusHistory.$inferSelect;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type BudgetAllocation = typeof budgetAllocations.$inferSelect;
export type AllocationFlag = typeof allocationFlags.$inferSelect;
export type Escalation = typeof escalations.$inferSelect;
export type Beneficiary = typeof beneficiaries.$inferSelect;
export type Entitlement = typeof entitlements.$inferSelect;
export type Disbursement = typeof disbursements.$inferSelect;
export type DonorOrganization = typeof donorOrganizations.$inferSelect;
export type DonorFundingScope = typeof donorFundingScopes.$inferSelect;
export type UssdSession = typeof ussdSessions.$inferSelect;
export type DemoSmsOutboxEntry = typeof demoSmsOutbox.$inferSelect;

/**
 * The shape a `userProfiles` row takes AFTER `medicalConditions` has been
 * decrypted — i.e. what every reader outside lib/http/session.ts,
 * modules/ai/conversation.service.ts, and the profile route should expect.
 * The raw `UserProfile` type still describes what is actually in the
 * database column (ciphertext), which is exactly why those three sites are
 * the only ones allowed to hand back a raw row.
 */
export type DecryptedUserProfile = Omit<UserProfile, 'medicalConditions'> & {
  readonly medicalConditions: string[] | null;
};

export { sql };
