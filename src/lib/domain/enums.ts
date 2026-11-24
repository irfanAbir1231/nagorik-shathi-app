/**
 * Single source of truth for every closed vocabulary in the system.
 * The Drizzle schema, Zod validators, and UI all import from here, so a new
 * value cannot be added in one layer and forgotten in another.
 */

/* ------------------------------------------------------------------ roles */
// PRD §43
export const USER_ROLES = ['guest', 'citizen', 'moderator', 'administrator', 'super_admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Ascending privilege. Used by the RBAC guard for `atLeast` comparisons. */
export const ROLE_RANK: Record<UserRole, number> = {
  guest: 0,
  citizen: 1,
  moderator: 2,
  administrator: 3,
  super_admin: 4,
};

export const STAFF_ROLES: readonly UserRole[] = ['moderator', 'administrator', 'super_admin'];

export const USER_STATUSES = ['active', 'suspended', 'deleted'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/* ------------------------------------------------- opportunity taxonomy */
// PRD §58 OpportunityCategories
export const OPPORTUNITY_CATEGORIES = [
  'scholarship',
  'healthcare',
  'agriculture',
  'business',
  'legal_aid',
  'employment',
  'financial',
  'social_welfare',
  'training',
  'disaster',
  'research',
] as const;
export type OpportunityCategory = (typeof OPPORTUNITY_CATEGORIES)[number];

// PRD §56 Organization types
export const ORGANIZATION_TYPES = [
  'government',
  'ngo',
  'hospital',
  'university',
  'bank',
  'training_center',
] as const;
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export const OPPORTUNITY_STATUSES = ['draft', 'open', 'closed', 'rolling', 'archived'] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

/**
 * Knowledge-base trust state. PRD Part 7 (which would have defined the
 * ingestion and verification pipeline) is absent from the source document, so
 * this vocabulary is authored here — see docs/DEVIATIONS.md §2.
 *
 * `unverified_sample` is load-bearing: the UI must visibly mark any record in
 * that state, and the confidence scorer penalises it. It is how the system
 * avoids presenting an authored placeholder as a verified government rule.
 */
export const VERIFICATION_STATUSES = [
  'unverified_sample',
  'pending_review',
  'verified',
  'outdated',
  'disputed',
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/**
 * Kinds of place a citizen might be sent to.
 *
 * Lifted out of the schema so the OSM tag map, the UI labels and the column
 * definition all read from one list — a type present in the database but missing
 * from the label map renders as `police_station` to a citizen.
 *
 * The first three are administrative TIERS, and the distinction is not cosmetic:
 * in Bangladesh the tier decides which forms can be filed where. OpenStreetMap
 * does not record the tier, so OSM-sourced government offices use the untiered
 * `government_office` rather than being assigned a tier we would be guessing at.
 */
export const SERVICE_LOCATION_TYPES = [
  'union_office',
  'upazila_office',
  'district_office',
  'government_office',
  'hospital',
  'clinic',
  'pharmacy',
  'police_station',
  'court',
  'fire_station',
  'post_office',
  'legal_aid',
  'agriculture_office',
  'training_center',
  'ngo_office',
  'bank',
  'digital_center',
] as const;
export type ServiceLocationType = (typeof SERVICE_LOCATION_TYPES)[number];

/** Where a place record came from. Shown to the citizen, never inferred. */
export const PLACE_SOURCES = ['seed', 'osm'] as const;
export type PlaceSource = (typeof PLACE_SOURCES)[number];

/* ------------------------------------------------------- citizen profile */
export const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'] as const;
export type Gender = (typeof GENDERS)[number];

export const MARITAL_STATUSES = ['single', 'married', 'widowed', 'divorced', 'separated'] as const;
export type MaritalStatus = (typeof MARITAL_STATUSES)[number];

export const EDUCATION_LEVELS = [
  'none',
  'primary',
  'jsc',
  'ssc',
  'hsc',
  'diploma',
  'bachelor',
  'master',
  'phd',
] as const;
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

/** Ordinal comparison for rules such as `education >= hsc`. */
export const EDUCATION_RANK: Record<EducationLevel, number> = {
  none: 0,
  primary: 1,
  jsc: 2,
  ssc: 3,
  hsc: 4,
  diploma: 5,
  bachelor: 6,
  master: 7,
  phd: 8,
};

export const OCCUPATIONS = [
  'student',
  'farmer',
  'day_labourer',
  'homemaker',
  'private_employee',
  'government_employee',
  'self_employed',
  'small_business',
  'fisherman',
  'weaver',
  'rickshaw_driver',
  'garment_worker',
  'teacher',
  'unemployed',
  'retired',
  'other',
] as const;
export type Occupation = (typeof OCCUPATIONS)[number];

export const DISABILITY_TYPES = [
  'none',
  'visual',
  'hearing',
  'speech',
  'physical',
  'intellectual',
  'multiple',
  'other',
] as const;
export type DisabilityType = (typeof DISABILITY_TYPES)[number];

/* --------------------------------------------------------- eligibility */
// PRD §17 Outputs
export const ELIGIBILITY_OUTCOMES = ['eligible', 'partially_eligible', 'not_eligible', 'unknown'] as const;
export type EligibilityOutcome = (typeof ELIGIBILITY_OUTCOMES)[number];

export const RULE_OPERATORS = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'not_in',
  'between',
  'exists',
  'not_exists',
  'contains_any',
  'contains_all',
] as const;
export type RuleOperator = (typeof RULE_OPERATORS)[number];

/* -------------------------------------------------------- conversation */
export const MESSAGE_ROLES = ['user', 'assistant', 'system'] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

// PRD §61 message types
export const MESSAGE_KINDS = [
  'text',
  'clarification',
  'recommendation',
  'action_plan',
  'eligibility',
  'system',
  'error',
] as const;
export type MessageKind = (typeof MESSAGE_KINDS)[number];

// PRD §20 Module 2
export const INTENTS = [
  'find_opportunities',
  'check_eligibility',
  'scholarship_search',
  'healthcare_search',
  'ngo_assistance',
  'agriculture_support',
  'sme_support',
  'ask_question',
  'document_requirements',
  'nearby_services',
  'timeline_request',
  'follow_up',
  'general_information',
] as const;
export type Intent = (typeof INTENTS)[number];

// PRD §23 Life Event Detection Engine
export const LIFE_EVENTS = [
  'job_loss',
  'widowhood',
  'higher_education',
  'serious_medical_need',
  'entrepreneurship',
  'disaster_recovery',
  'disability_onset',
  'pregnancy',
  'old_age',
  'crop_loss',
  'child_education',
  'legal_dispute',
  'seeking_employment',
  'divorce',
  'migration',
] as const;
export type LifeEvent = (typeof LIFE_EVENTS)[number];

/* ------------------------------------------------------------- tracking */
// PRD §18 / §60
export const SAVED_STATUSES = [
  'interested',
  'preparing',
  'documents_ready',
  'applied',
  'under_review',
  'approved',
  'rejected',
  'completed',
] as const;
export type SavedStatus = (typeof SAVED_STATUSES)[number];

export const TASK_STATUSES = ['pending', 'in_progress', 'done', 'skipped'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['high', 'medium', 'low'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/* -------------------------------------------------------- notifications */
// PRD §67
export const NOTIFICATION_TYPES = [
  'application_reminder',
  'deadline_reminder',
  'new_opportunity',
  'program_updated',
  'document_expiring',
  'recommendation_improved',
  'system',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_CHANNELS = ['in_app', 'push', 'email', 'sms'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/* -------------------------------------------------------------- timeline */
export const TIMELINE_EVENT_TYPES = [
  'deadline',
  'document_expiry',
  'scholarship_window',
  'renewal',
  'training',
  'announcement',
  'application_progress',
  'reminder',
  'task',
] as const;
export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

/* ------------------------------------------------------------ knowledge */
export const DOCUMENT_SOURCE_TYPES = [
  'circular',
  'gazette',
  'web_page',
  'pdf',
  'form',
  'faq',
  'manual_entry',
] as const;
export type DocumentSourceType = (typeof DOCUMENT_SOURCE_TYPES)[number];

export const EMBEDDING_STATUSES = ['pending', 'processing', 'ready', 'failed', 'skipped'] as const;
export type EmbeddingStatus = (typeof EMBEDDING_STATUSES)[number];

export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/* ------------------------------------------------------------ feedback */
export const FEEDBACK_KINDS = [
  'helpful',
  'not_helpful',
  'incorrect_information',
  'missing_opportunity',
  'rating',
] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_STATUSES = ['new', 'reviewed', 'actioned', 'dismissed'] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

/* --------------------------------------------------------------- AI ops */
export const AI_ENGINES = ['anthropic', 'openai', 'deepseek', 'simulated'] as const;
export type AiEngine = (typeof AI_ENGINES)[number];

export const AI_REQUEST_TYPES = [
  'conversation',
  'intent_classification',
  'entity_extraction',
  'life_event_detection',
  'explanation',
  'summarization',
  'action_plan',
  'embedding',
] as const;
export type AiRequestType = (typeof AI_REQUEST_TYPES)[number];

/* ------------------------------------------------------------- theming */
export const THEMES = ['light', 'dark', 'sunlight'] as const;
export type Theme = (typeof THEMES)[number];

/** BDS §4.6 — four steps, previewed live on real content. */
export const TEXT_SCALES = [1, 1.15, 1.3, 1.5] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

export const NUMERAL_SYSTEMS = ['latin', 'bengali'] as const;
export type NumeralSystem = (typeof NUMERAL_SYSTEMS)[number];

/* ------------------------------------------------------- civic: identity */
// Phase 1 — verified identity & place. See docs/DEVIATIONS.md.

/**
 * `simulated_verified` is load-bearing, the same way `unverified_sample` is
 * for the knowledge base: no live government NID API is wired into this
 * build (see docs/EXTERNAL.md), so a format-valid number is labelled as
 * simulated, never as `verified`. Only a real provider integration may ever
 * write `verified`.
 */
export const NID_VERIFICATION_STATUSES = [
  'unverified',
  'simulated_verified',
  'verified',
  'rejected',
] as const;
export type NidVerificationStatus = (typeof NID_VERIFICATION_STATUSES)[number];

/**
 * How a citizen's union was confirmed. A GPS geofence is stronger evidence
 * than a self-picked union from a list, and the two are shown differently —
 * see `IdentityVerification.tsx`.
 */
export const RESIDENCY_VERIFICATION_METHODS = ['gps_geofence', 'manual_attestation'] as const;
export type ResidencyVerificationMethod = (typeof RESIDENCY_VERIFICATION_METHODS)[number];

/* --------------------------------------------------------- civic: issues */
// Phase 2 — citizen voice ("Amar Union, Amar Sheba"). See docs/DEVIATIONS.md.

export const ISSUE_CATEGORIES = [
  'road',
  'water_supply',
  'electricity',
  'sanitation',
  'education_facility',
  'health_facility',
  'safety',
  'corruption',
  'environment',
  'other',
] as const;
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

/**
 * The state machine is fixed by the source spec: Submitted → UnderReview →
 * (Verified | Rejected) → InProgress → Completed → Archived. `submitted` is
 * kept as a distinct value for API/future-intake compatibility (e.g. an
 * SMS/USSD channel queuing reports asynchronously — Phase 5) even though the
 * current web flow moves a report straight to `under_review` on submission.
 * Valid transitions are enforced in `modules/issues/state-machine.ts`, not
 * just documented here.
 */
export const ISSUE_STATUSES = [
  'submitted',
  'under_review',
  'verified',
  'rejected',
  'in_progress',
  'completed',
  'archived',
] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

/* -------------------------------------------------- civic: Phase 3 roles */
// SJ-31–34. Deliberately NOT folded into USER_ROLES/ROLE_RANK: a chairman is
// not "above" or "below" a moderator, they hold an unrelated capability over
// a specific union. CIVIC_ROLE_RANK exists only to order the four civic
// titles by nominal seniority for display — authorisation is scope-based
// (does this user hold this title for THIS union/upazila/district), never a
// bare rank comparison. See modules/civic/roles.ts.
export const CIVIC_ROLES = ['none', 'union_staff', 'union_chairman', 'upazila_officer', 'zila_officer'] as const;
export type CivicRole = (typeof CIVIC_ROLES)[number];

export const CIVIC_ROLE_RANK: Record<CivicRole, number> = {
  none: 0,
  union_staff: 1,
  union_chairman: 2,
  upazila_officer: 3,
  zila_officer: 4,
};

/* --------------------------------------------- civic: Phase 3 ledger */
export const LEDGER_ENTITY_TYPES = ['budget_allocation', 'disbursement'] as const;
export type LedgerEntityType = (typeof LEDGER_ENTITY_TYPES)[number];

export const ESCALATION_STATUSES = ['pending', 'acknowledged', 'resolved', 'dismissed'] as const;
export type EscalationStatus = (typeof ESCALATION_STATUSES)[number];

export const BENEFICIARY_STATUSES = ['active', 'suspended', 'inactive'] as const;
export type BeneficiaryStatus = (typeof BENEFICIARY_STATUSES)[number];

export const ENTITLEMENT_STATUSES = ['active', 'suspended', 'completed'] as const;
export type EntitlementStatus = (typeof ENTITLEMENT_STATUSES)[number];

export const ENTITLEMENT_PERIODS = ['monthly', 'quarterly', 'one_time'] as const;
export type EntitlementPeriod = (typeof ENTITLEMENT_PERIODS)[number];

export const DISBURSEMENT_STATUSES = ['scheduled', 'paid', 'failed', 'on_hold'] as const;
export type DisbursementStatus = (typeof DISBURSEMENT_STATUSES)[number];

/* --------------------------------------------- civic: Phase 5 moderation */
// SJ-21. `not_applicable` is the default for every issue without a photo;
// `unavailable` means a photo was submitted but no vision provider is
// configured, which is why it still routes to human review rather than
// passing silently. `demo_passed`/`demo_flagged` are a separate pair of
// values, never `passed`/`flagged`, so a row produced by
// VISION_MODERATION_PROVIDER=demo's simulated check can never be mistaken
// for a real vision-model verdict later, even though nothing in the citizen
// UI currently renders the distinction — see modules/issues/vision-moderation.ts.
export const VISION_MODERATION_STATUSES = [
  'not_applicable', 'unavailable', 'passed', 'flagged', 'demo_passed', 'demo_flagged',
] as const;
export type VisionModerationStatus = (typeof VISION_MODERATION_STATUSES)[number];

/* ------------------------------------------- service discovery (admin) */
// How a watched government source lists its pages. `manual` sources exist only
// so links an admin pastes have a home; the discovery job never crawls them.
export const SOURCE_KINDS = ['dss_portal', 'single_page', 'manual'] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

// A candidate is either a programme we do not list yet, or a change to one we do.
export const CANDIDATE_KINDS = ['new', 'change'] as const;
export type CandidateKind = (typeof CANDIDATE_KINDS)[number];

// `pending` is the only state an admin acts on; the rest are decisions.
export const CANDIDATE_STATUSES = ['pending', 'approved', 'rejected', 'snoozed', 'duplicate'] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

// Which extractor filled the draft. `manual` means nothing could be read
// automatically (or the source forbids AI use) and an admin types the fields.
export const CANDIDATE_EXTRACTORS = ['rules', 'ai', 'manual'] as const;
export type CandidateExtractor = (typeof CANDIDATE_EXTRACTORS)[number];
