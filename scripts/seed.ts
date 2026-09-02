/* eslint-disable no-console */
import './load-env';
import { eq } from 'drizzle-orm';
import { db, initialisePragmas, sqlClient } from '../src/lib/db/client';
import * as s from '../src/lib/db/schema';
import {
  SEED_ORGANIZATIONS, SEED_OPPORTUNITIES, SEED_LIFE_EVENTS, SEED_LOCATIONS, SEED_UNIONS,
  validateSeedCorpus, SEED_STATS,
} from '../src/lib/db/seed';
import { hashSecret, fastHash } from '../src/lib/security/hash';
import { chunkText, termFrequencies, estimateTokens } from '../src/modules/knowledge/tokenizer';
import { addDays } from '../src/lib/format/dates';
import { createAllocation, flagAllocation } from '../src/modules/budget/budget.service';
import { enrollBeneficiary, recordDisbursement } from '../src/modules/entitlements/entitlement.service';

/**
 * Seeds the knowledge base, the retrieval index, and demo accounts.
 *
 * Idempotent by construction: it clears the content tables it owns before
 * writing, so `npm run db:seed` can be run repeatedly. It does NOT clear user
 * data unless --reset-users is passed, so a developer's test conversations
 * survive a corpus refresh.
 */

const RESET_USERS = process.argv.includes('--reset-users');

const now = new Date();

/** Rahima's demo NID — invented for this seed, hashed the same way modules/identity/nid.service.ts does, so her own account and her beneficiary enrolment resolve to the same hash. */
const RAHIMA_DEMO_NID = '1234567890';

async function main() {
  console.log('Shebar Janala — seeding knowledge base\n');

  const validation = validateSeedCorpus();
  for (const warning of validation.warnings) console.warn(`  warning: ${warning}`);
  if (!validation.ok) {
    console.error('\nSeed corpus failed validation:');
    for (const error of validation.errors) console.error(`  • ${error}`);
    process.exit(1);
  }
  console.log(`  corpus valid: ${SEED_STATS.opportunities} programmes, ${SEED_STATS.organizations} organisations, ${SEED_STATS.categories} categories\n`);

  await initialisePragmas();

  // ---------------------------------------------------------------- clear
  // Order matters: children before parents, because foreign keys are ON.
  console.log('  clearing existing corpus…');
  await db.delete(s.documentChunks);
  await db.delete(s.documents);
  await db.delete(s.requiredDocuments);
  await db.delete(s.eligibilityRules);
  await db.delete(s.knowledgeGraphEdges);
  await db.delete(s.serviceLocations);
  if (RESET_USERS) {
    await db.delete(s.eligibilityEvaluations);
    await db.delete(s.timelineEvents);
    await db.delete(s.actionPlanTasks);
    await db.delete(s.actionPlans);
    await db.delete(s.savedStatusHistory);
    await db.delete(s.savedOpportunities);
    await db.delete(s.notifications);
    await db.delete(s.messages);
    await db.delete(s.conversations);
    await db.delete(s.aiLogs);
    await db.delete(s.feedback);
    // Phase 3 — cleared explicitly, before `users`: `budget_allocations.posted_by`
    // is ON DELETE RESTRICT (a chairman's financial records must not silently
    // vanish via an unrelated user cleanup), so it has to go first, not cascade.
    await db.delete(s.allocationFlags);
    await db.delete(s.escalations);
    await db.delete(s.budgetAllocations);
    await db.delete(s.disbursements);
    await db.delete(s.entitlements);
    await db.delete(s.beneficiaries);
    await db.delete(s.ledgerEntries);
    // Phase 4 — same reasoning as above: `users.donor_org_id` is a nullable
    // FK (ON DELETE SET NULL), so ordering here is not strictly required for
    // integrity, but clearing it alongside the other civic tables keeps this
    // block legible as "everything Shebar Janala owns, before users".
    await db.delete(s.donorFundingScopes);
    await db.delete(s.donorOrganizations);
    // Phase 5 demo aids — ephemeral by nature, cleared on every reset so a
    // stale "sent" message or half-finished USSD session from a previous
    // demo never lingers into the next one.
    await db.delete(s.demoSmsOutbox);
    await db.delete(s.ussdSessions);
    await db.delete(s.sessions);
    await db.delete(s.otpChallenges);
    await db.delete(s.userSettings);
    await db.delete(s.userProfiles);
    await db.delete(s.users);
  }
  await db.delete(s.opportunities);
  await db.delete(s.organizations);
  await db.delete(s.lifeEventCatalog);

  // -------------------------------------------------------- life events
  console.log('  life events…');
  await db.insert(s.lifeEventCatalog).values(
    SEED_LIFE_EVENTS.map((e) => ({
      code: e.code,
      label: e.label[0],
      labelBn: e.label[1],
      description: e.description[0],
      descriptionBn: e.description[1],
      keywords: [...e.keywords],
      icon: e.icon,
      sortOrder: e.sortOrder,
    })),
  );

  // ------------------------------------------------------ organisations
  console.log('  organisations…');
  const orgIds = new Map<string, string>();
  for (const org of SEED_ORGANIZATIONS) {
    const id = crypto.randomUUID();
    orgIds.set(org.key, id);
    await db.insert(s.organizations).values({
      id,
      name: org.name[0],
      nameBn: org.name[1],
      type: org.type,
      description: org.description[0],
      descriptionBn: org.description[1],
      website: org.website ?? null,
      contactPhone: org.contactPhone ?? null,
      address: org.address?.[0] ?? null,
      addressBn: org.address?.[1] ?? null,
      division: org.division ?? null,
      district: org.district ?? null,
      officeHours: org.officeHours?.[0] ?? null,
      officeHoursBn: org.officeHours?.[1] ?? null,
      verified: org.verified ?? false,
      // The ENTITY is real and verified; its contact details are not.
      verificationStatus: org.verificationStatus ?? 'unverified_sample',
    });
  }

  // ------------------------------------------------------- opportunities
  console.log('  programmes, rules, documents and retrieval index…');
  const opportunityIds = new Map<string, string>();
  let chunkCount = 0;

  for (const o of SEED_OPPORTUNITIES) {
    const organizationId = orgIds.get(o.org);
    if (!organizationId) throw new Error(`Unknown organisation key "${o.org}"`);

    const id = crypto.randomUUID();
    opportunityIds.set(o.slug, id);

    await db.insert(s.opportunities).values({
      id,
      organizationId,
      title: o.title[0],
      titleBn: o.title[1],
      slug: o.slug,
      category: o.category,
      summary: o.summary[0],
      summaryBn: o.summary[1],
      description: o.description[0],
      descriptionBn: o.description[1],
      benefits: o.benefits[0],
      benefitsBn: o.benefits[1],
      benefitAmount: o.benefitAmount ?? null,
      benefitPeriod: o.benefitPeriod ?? null,
      applicationProcess: o.steps.map((step, index) => ({ step: index + 1, en: step[0], bn: step[1] })),
      deadline: o.deadlineInDays === undefined ? null : addDays(now, o.deadlineInDays),
      recurrence: o.recurrence ?? 'none',
      status: 'open',
      coverageDistricts: [...(o.coverage ?? [])],
      officialUrl: o.sourceUrl ?? null,
      applyUrl: o.applyUrl ?? null,
      processingTimeDays: o.processingTime?.[0] ?? null,
      renewalMonths: o.renewalMonths ?? null,
      lifeEvents: [...o.lifeEvents],
      tags: [...o.tags],
      viewCount: 0,
      saveCount: 0,
      applicationCount: 0,
      verificationStatus: 'unverified_sample',
      sourceUrl: o.sourceUrl ?? null,
      sourceNote: o.sourceNote?.[0] ?? null,
      lastVerifiedAt: null,
      verifiedBy: null,
      reviewIntervalDays: 180,
      version: 1,
    });

    await db.insert(s.eligibilityRules).values({
      opportunityId: id,
      ruleJson: o.rules,
      priority: 0,
      version: 1,
      active: true,
      authoredBy: 'seed',
      reviewedBy: null,
      reviewedAt: null,
    });

    if (o.docs.length > 0) {
      await db.insert(s.requiredDocuments).values(
        o.docs.map((doc, index) => ({
          opportunityId: id,
          name: doc.name[0],
          nameBn: doc.name[1],
          required: doc.required ?? true,
          issuingAuthority: doc.authority?.[0] ?? null,
          issuingAuthorityBn: doc.authority?.[1] ?? null,
          commonMistake: doc.mistake?.[0] ?? null,
          commonMistakeBn: doc.mistake?.[1] ?? null,
          tip: doc.tip?.[0] ?? null,
          tipBn: doc.tip?.[1] ?? null,
          validityMonths: doc.validityMonths ?? null,
          sortOrder: index,
        })),
      );
    }

    /* ---- retrieval document + chunks ----
       One synthetic document per programme, holding the full bilingual text.
       This is what the RAG layer cites, so it must contain everything the LLM
       is permitted to state: benefits, steps, and document requirements. */
    const documentId = crypto.randomUUID();
    const bodyEn = [
      `# ${o.title[0]}`,
      o.summary[0],
      o.description[0],
      `## Benefits\n${o.benefits[0]}`,
      `## How to apply\n${o.steps.map((st, i) => `${i + 1}. ${st[0]}`).join('\n')}`,
      `## Documents needed\n${o.docs.map((d) => `- ${d.name[0]}${d.required === false ? ' (optional)' : ''}`).join('\n')}`,
    ].join('\n\n');
    const bodyBn = [
      `# ${o.title[1]}`,
      o.summary[1],
      o.description[1],
      `## সুবিধা\n${o.benefits[1]}`,
      `## আবেদনের ধাপ\n${o.steps.map((st, i) => `${i + 1}. ${st[1]}`).join('\n')}`,
      `## প্রয়োজনীয় কাগজপত্র\n${o.docs.map((d) => `- ${d.name[1]}${d.required === false ? ' (ঐচ্ছিক)' : ''}`).join('\n')}`,
    ].join('\n\n');

    await db.insert(s.documents).values({
      id: documentId,
      opportunityId: id,
      organizationId,
      title: o.title[0],
      titleBn: o.title[1],
      sourceType: 'manual_entry',
      sourceUrl: o.sourceUrl ?? null,
      publisher: SEED_ORGANIZATIONS.find((x) => x.key === o.org)?.name[0] ?? null,
      publishedAt: null,
      retrievedAt: now,
      checksum: null,
      version: 1,
      licenseNote:
        'Authored summary of a publicly described government or NGO programme. Not a reproduction of an official circular.',
      textContent: `${bodyEn}\n\n---\n\n${bodyBn}`,
      embeddingStatus: 'skipped',
      verificationStatus: 'unverified_sample',
      stale: false,
      deadLink: false,
    });

    // Bangla and English chunks are stored separately so a Bangla query
    // retrieves Bangla text to cite, and vice versa.
    const chunks = [...chunkText(bodyEn), ...chunkText(bodyBn)];
    if (chunks.length > 0) {
      await db.insert(s.documentChunks).values(
        chunks.map((content, index) => ({
          documentId,
          opportunityId: id,
          chunkIndex: index,
          content,
          tokenCount: estimateTokens(content),
          embedding: null,
          embeddingModel: null,
          termFrequencies: termFrequencies(content),
          metadata: {
            slug: o.slug,
            category: o.category,
            title: o.title[0],
            titleBn: o.title[1],
          },
        })),
      );
      chunkCount += chunks.length;
    }
  }

  // ------------------------------------------------- knowledge graph
  console.log('  knowledge graph edges…');
  const edges: (typeof s.knowledgeGraphEdges.$inferInsert)[] = [];
  for (const o of SEED_OPPORTUNITIES) {
    const opportunityId = opportunityIds.get(o.slug)!;
    for (const event of o.lifeEvents) {
      edges.push({
        fromType: 'life_event', fromId: event, relation: 'triggers',
        toType: 'opportunity', toId: opportunityId, weight: 1,
      });
    }
    edges.push({
      fromType: 'opportunity', fromId: opportunityId, relation: 'offered_by',
      toType: 'organization', toId: orgIds.get(o.org)!, weight: 1,
    });
    edges.push({
      fromType: 'opportunity', fromId: opportunityId, relation: 'belongs_to',
      toType: 'category', toId: o.category, weight: 1,
    });
  }
  // Complementary programmes: same life event and same category pair up, which
  // is what lets the Opportunity Graph show an ecosystem rather than a list.
  for (const a of SEED_OPPORTUNITIES) {
    for (const b of SEED_OPPORTUNITIES) {
      if (a.slug >= b.slug) continue;
      const sharedEvents = a.lifeEvents.filter((e) => b.lifeEvents.includes(e));
      if (sharedEvents.length > 0 && a.category !== b.category) {
        edges.push({
          fromType: 'opportunity', fromId: opportunityIds.get(a.slug)!, relation: 'complements',
          toType: 'opportunity', toId: opportunityIds.get(b.slug)!,
          weight: sharedEvents.length,
          note: `Shared life events: ${sharedEvents.join(', ')}`,
        });
      }
    }
  }
  for (let i = 0; i < edges.length; i += 200) {
    await db.insert(s.knowledgeGraphEdges).values(edges.slice(i, i + 200));
  }

  // ------------------------------------------------------- locations
  console.log('  service locations…');
  const locationRows = SEED_LOCATIONS.map((l) => ({
    organizationId: l.orgKey ? (orgIds.get(l.orgKey) ?? null) : null,
    name: l.name[0],
    nameBn: l.name[1],
    type: l.type,
    address: l.address[0],
    addressBn: l.address[1],
    division: l.division,
    district: l.district,
    upazila: null,
    lat: l.lat,
    lng: l.lng,
    phone: l.phone ?? null,
    officeHours: l.officeHours[0],
    officeHoursBn: l.officeHours[1],
    services: [...l.services],
    verificationStatus: 'unverified_sample' as const,
  }));
  for (let i = 0; i < locationRows.length; i += 200) {
    await db.insert(s.serviceLocations).values(locationRows.slice(i, i + 200));
  }

  // ------------------------------------------------- union boundaries
  // Upserted by unionCode, never deleted: `issues.unionId` restricts deletion
  // while a citizen's report references it, and a citizen's reports are
  // exactly the kind of data a corpus refresh (`npm run db:seed` without
  // --reset-users) must not discard.
  console.log('  union boundaries…');
  const unionIds = new Map<string, string>();
  for (const u of SEED_UNIONS) {
    const [row] = await db
      .insert(s.unionBoundaries)
      .values({
        unionCode: u.unionCode,
        name: u.name,
        nameBn: u.nameBn,
        division: u.division,
        district: u.district,
        upazila: u.upazila,
        centroidLat: u.centroidLat,
        centroidLng: u.centroidLng,
        polygon: u.polygon,
        verificationStatus: 'unverified_sample',
      })
      .onConflictDoUpdate({
        target: s.unionBoundaries.unionCode,
        set: {
          name: u.name,
          nameBn: u.nameBn,
          division: u.division,
          district: u.district,
          upazila: u.upazila,
          centroidLat: u.centroidLat,
          centroidLng: u.centroidLng,
          polygon: u.polygon,
        },
      })
      .returning({ id: s.unionBoundaries.id });
    unionIds.set(u.unionCode, row!.id);
  }

  // ---------------------------------------------------- demo accounts
  const existingUsers = await db.select({ id: s.users.id }).from(s.users).limit(1);
  if (existingUsers.length === 0 || RESET_USERS) {
    console.log('  demo accounts…');
    const pinHash = await hashSecret('1234');
    const adminPinHash = await hashSecret('4321');

    // Phase 4 (SJ-27) — a donor organisation scoped to exactly the programme
    // this seed enrols a real beneficiary in, so the donor portal has real
    // numbers to show rather than a scope with nothing behind it.
    console.log('  donor organisation…');
    const [donorOrg] = await db
      .insert(s.donorOrganizations)
      .values({
        name: 'UNDP Bangladesh — Social Protection Programme',
        nameBn: 'ইউএনডিপি বাংলাদেশ — সামাজিক সুরক্ষা কর্মসূচি',
        description: 'Development partner co-financing union-level social safety net disbursements.',
      })
      .returning();
    await db.insert(s.donorFundingScopes).values({ donorOrgId: donorOrg!.id, programCode: 'widow-allowance' });

    const demo = [
      {
        phone: '01712345678', name: 'রহিমা বেগম', role: 'citizen' as const, district: 'rangpur',
        pinHash, language: 'bn' as const,
        profile: {
          statedAge: 58, gender: 'female' as const, maritalStatus: 'widowed' as const,
          occupation: 'homemaker' as const, monthlyIncome: 900, education: 'primary' as const,
          district: 'rangpur', division: 'rangpur', householdSize: 4, dependents: 3,
          landOwnershipDecimals: 8, hasNid: true, hasBankAccount: false, citizenship: 'bangladeshi',
          isStudent: false, hasDisability: false,
          lifeEvents: [{ event: 'widowhood', detectedAt: now.getTime(), source: 'profile' as const }],
          // Pre-verified so the demo can show issue reporting/voting without
          // first walking through Phase 1 — one account demonstrates the
          // "already verified" state, the others still show the real flow.
          nidNumberHash: fastHash(`nid:${RAHIMA_DEMO_NID}`),
          nidVerificationStatus: 'simulated_verified' as const,
          nidVerifiedAt: now,
          residencyUnionId: unionIds.get('rangpur-sadar-kaligonj') ?? null,
          residencyVerificationMethod: 'manual_attestation' as const,
          residencyVerifiedAt: now,
        },
      },
      {
        phone: '01812345678', name: 'Tanvir Ahmed', role: 'citizen' as const, district: 'rajshahi',
        pinHash, language: 'en' as const,
        profile: {
          statedAge: 23, gender: 'male' as const, maritalStatus: 'single' as const,
          occupation: 'student' as const, monthlyIncome: 0, education: 'bachelor' as const,
          cgpa: 3.78, university: 'University of Rajshahi', department: 'Computer Science',
          district: 'rajshahi', division: 'rajshahi', householdSize: 5, dependents: 0,
          isStudent: true, hasNid: true, hasBankAccount: true, citizenship: 'bangladeshi',
          hasDisability: false, preferredCountry: 'Germany',
          lifeEvents: [{ event: 'higher_education', detectedAt: now.getTime(), source: 'profile' as const }],
        },
      },
      {
        phone: '01912345678', name: 'করিম মিয়া', role: 'citizen' as const, district: 'kurigram',
        pinHash, language: 'bn' as const,
        profile: {
          statedAge: 47, gender: 'male' as const, maritalStatus: 'married' as const,
          occupation: 'farmer' as const, monthlyIncome: 6500, education: 'jsc' as const,
          district: 'kurigram', division: 'rangpur', householdSize: 6, dependents: 4,
          landOwnershipDecimals: 65, farmSizeDecimals: 65, crops: ['rice', 'jute'],
          livestock: ['cattle'], hasNid: true, hasBankAccount: true, citizenship: 'bangladeshi',
          isStudent: false, hasDisability: false,
          lifeEvents: [{ event: 'crop_loss', detectedAt: now.getTime(), source: 'profile' as const }],
        },
      },
      {
        // A second verified Kaligonj resident, purely so the escalation demo
        // below has two distinct flaggers rather than one account doing
        // everything — ESCALATION_MIN_FLAGS is 2 for exactly this reason.
        phone: '01711112222', name: 'মিনা আক্তার', role: 'citizen' as const, district: 'rangpur',
        pinHash, language: 'bn' as const,
        profile: {
          statedAge: 34, gender: 'female' as const, maritalStatus: 'married' as const,
          occupation: 'homemaker' as const, monthlyIncome: 5000, education: 'ssc' as const,
          district: 'rangpur', division: 'rangpur', householdSize: 4, dependents: 2,
          hasNid: true, hasBankAccount: true, citizenship: 'bangladeshi',
          isStudent: false, hasDisability: false,
          nidVerificationStatus: 'simulated_verified' as const,
          nidVerifiedAt: now,
          residencyUnionId: unionIds.get('rangpur-sadar-kaligonj') ?? null,
          residencyVerificationMethod: 'gps_geofence' as const,
          residencyVerifiedAt: now,
        },
      },
      {
        // Phase 3 — SJ-31: Union Parishad Chairman of Kaligonj. Verified
        // identity and residency the same way any citizen would be (Phase 1
        // is a real dependency, not a formality) — a chairman is also a
        // resident of the union they chair.
        phone: '01911112222', name: 'মোঃ জসিম উদ্দিন', role: 'citizen' as const, district: 'rangpur',
        pinHash, language: 'bn' as const,
        civicRole: 'union_chairman' as const,
        civicUnionId: unionIds.get('rangpur-sadar-kaligonj') ?? null,
        profile: {
          statedAge: 52, gender: 'male' as const, maritalStatus: 'married' as const,
          occupation: 'other' as const, district: 'rangpur', division: 'rangpur',
          hasNid: true, citizenship: 'bangladeshi',
          nidVerificationStatus: 'simulated_verified' as const,
          nidVerifiedAt: now,
          residencyUnionId: unionIds.get('rangpur-sadar-kaligonj') ?? null,
          residencyVerificationMethod: 'manual_attestation' as const,
          residencyVerifiedAt: now,
        },
      },
      {
        // SJ-33: Upazila Officer over Rangpur Sadar — the upazila Kaligonj
        // union belongs to. Not itself a citizen profile; officers act on
        // their civic title, not an eligibility profile.
        phone: '01611112222', name: 'নাজমা সুলতানা', role: 'citizen' as const, district: 'rangpur',
        pinHash, language: 'bn' as const,
        civicRole: 'upazila_officer' as const,
        civicUpazila: 'Rangpur Sadar',
        profile: null,
      },
      {
        // Union staff of Mominpur — the second union in the SAME upazila as
        // Kaligonj (SJ-29's rollup only means something with two).
        phone: '01411112222', name: 'সোহেল রানা', role: 'citizen' as const, district: 'rangpur',
        pinHash, language: 'bn' as const,
        civicRole: 'union_staff' as const,
        civicUnionId: unionIds.get('rangpur-sadar-mominpur') ?? null,
        profile: null,
      },
      {
        // Phase 4 — SJ-27: represents the donor org above. Not a civic role
        // (a donor holds no authority over any union) and not itself a
        // citizen profile — the account exists only to view the portal.
        phone: '01511112222', name: 'Nasreen Chowdhury', role: 'citizen' as const, district: 'dhaka',
        pinHash, language: 'en' as const, donorOrgId: donorOrg!.id, profile: null,
      },
      {
        phone: '01612345678', name: 'Shebar Janala Moderator', role: 'moderator' as const,
        district: 'dhaka', pinHash: adminPinHash, language: 'en' as const, profile: null,
      },
      {
        phone: '01512345678', name: 'Shebar Janala Administrator', role: 'administrator' as const,
        district: 'dhaka', pinHash: adminPinHash, language: 'en' as const, profile: null,
      },
    ];

    let rahimaId: string | null = null;
    let minaId: string | null = null;
    let chairmanId: string | null = null;
    let upazilaOfficerId: string | null = null;
    let mominpurStaffId: string | null = null;
    for (const d of demo) {
      const userId = crypto.randomUUID();
      if (d.phone === '01712345678') rahimaId = userId;
      if (d.phone === '01711112222') minaId = userId;
      if (d.phone === '01911112222') chairmanId = userId;
      if (d.phone === '01611112222') upazilaOfficerId = userId;
      if (d.phone === '01411112222') mominpurStaffId = userId;
      await db.insert(s.users).values({
        id: userId,
        phone: d.phone,
        name: d.name,
        role: d.role,
        status: 'active',
        language: d.language,
        district: d.district,
        pinHash: d.pinHash,
        phoneVerifiedAt: now,
        civicRole: 'civicRole' in d ? d.civicRole : 'none',
        civicUnionId: 'civicUnionId' in d ? d.civicUnionId : null,
        civicUpazila: 'civicUpazila' in d ? d.civicUpazila : null,
        donorOrgId: 'donorOrgId' in d ? d.donorOrgId : null,
      });
      await db.insert(s.userSettings).values({ userId, theme: 'light', textScale: 1, numeralSystem: 'latin' });
      if (d.profile) {
        await db.insert(s.userProfiles).values({ userId, ...d.profile, shareHealthData: false });
      }
    }

    // A couple of sample reports so the union feed and the moderation queue
    // are demonstrable immediately, without first walking through Phase 2.
    const kaligonjId = unionIds.get('rangpur-sadar-kaligonj');
    if (rahimaId && kaligonjId) {
      console.log('  sample issue reports…');
      const [verified] = await db
        .insert(s.issues)
        .values({
          reporterId: rahimaId,
          unionId: kaligonjId,
          category: 'water_supply',
          title: 'Tube well has been broken for two weeks',
          description:
            'The hand tube well near the primary school has stopped working. Families are walking to the next ward for drinking water.',
          lat: 25.756,
          lng: 89.286,
          status: 'verified',
          voteCount: 3,
          moderatedBy: rahimaId,
          moderationNote: 'Confirmed by ward member — sample record.',
        })
        .returning();
      await db.insert(s.issueStatusHistory).values([
        { issueId: verified!.id, fromStatus: null, toStatus: 'under_review', changedBy: rahimaId },
        { issueId: verified!.id, fromStatus: 'under_review', toStatus: 'verified', changedBy: rahimaId, note: 'Sample record.' },
      ]);

      const [pending] = await db
        .insert(s.issues)
        .values({
          reporterId: rahimaId,
          unionId: kaligonjId,
          category: 'road',
          title: 'Flooded road blocks access to the market',
          description: 'The main road to the union market floods after rain and becomes impassable for a day or two.',
          lat: 25.754,
          lng: 89.284,
          status: 'under_review',
        })
        .returning();
      await db.insert(s.issueStatusHistory).values({
        issueId: pending!.id,
        fromStatus: null,
        toStatus: 'under_review',
        changedBy: rahimaId,
      });
    }

    // ---- Phase 3: budget allocations, an escalated flag, and a real entitlement ----
    // Goes through the actual service functions (not raw inserts) so the
    // demo data is produced by exactly the code path a real chairman/citizen
    // would exercise — ledger entries, flag ratios, and escalation all real.
    if (rahimaId && minaId && chairmanId && kaligonjId) {
      console.log('  budget allocations, ledger, and entitlements…');

      const roadAllocation = await createAllocation({
        unionId: kaligonjId,
        postedBy: chairmanId,
        projectName: 'Kaligonj Bazar Road Repair',
        description: 'Resurfacing 600 metres of the market road damaged by monsoon flooding.',
        amount: 850_000,
        allocationDate: addDays(now, -20),
      });

      const suspectAllocation = await createAllocation({
        unionId: kaligonjId,
        postedBy: chairmanId,
        projectName: 'Union Office Renovation',
        description: 'Repainting and furniture replacement for the union parishad office.',
        amount: 1_200_000,
        allocationDate: addDays(now, -10),
      });

      await createAllocation({
        unionId: kaligonjId,
        postedBy: chairmanId,
        projectName: 'Community Tube Well Installation',
        description: 'Three new deep tube wells at the ward boundaries with the poorest water access.',
        amount: 450_000,
        allocationDate: addDays(now, -3),
      });

      // Two of Kaligonj's two verified residents flag the renovation project —
      // 2 of 2 is a 100% ratio, clearing both ESCALATION_MIN_FLAGS and
      // ESCALATION_THRESHOLD_RATIO, so this seeds a real, already-escalated
      // record rather than one waiting for a live flag to demonstrate it.
      await flagAllocation(suspectAllocation.id, rahimaId, 'The office looked freshly painted last year — this seems duplicated.');
      await flagAllocation(suspectAllocation.id, minaId, 'No public notice board announcement was posted for this one.');

      // Rahima's own demo NID (same hash as her verified profile above) is
      // enrolled as a real beneficiary — this is what makes SJ-15's
      // entitlement-status check return something real when SHE signs in,
      // instead of "not enrolled" on the account demonstrating it.
      const enrollment = await enrollBeneficiary({
        nidNumber: RAHIMA_DEMO_NID,
        unionId: kaligonjId,
        programCode: 'widow-allowance',
        programName: 'Widow Allowance',
        programNameBn: 'বিধবা ভাতা',
        enrolledBy: chairmanId,
        amount: 650,
        period: 'monthly',
      });
      await recordDisbursement({
        entitlementId: enrollment.entitlement.id,
        amount: 650,
        scheduledFor: addDays(now, -30),
        status: 'paid',
        recordedBy: chairmanId,
      });
      await recordDisbursement({
        entitlementId: enrollment.entitlement.id,
        amount: 650,
        scheduledFor: now,
        status: 'scheduled',
        recordedBy: chairmanId,
      });

      // Phase 4/5 — one real, live-triggering example of each anomaly check
      // (modules/oversight/anomaly.ts), so the Leader Portal's alerts section
      // shows something on a fresh seed instead of correctly-but-uselessly
      // showing nothing until someone manufactures an example by hand.
      console.log('  anomaly examples (allocation outlier, duplicate enrolment, overpayment, stale escalation)…');

      // 1. Allocation outlier — ~6x the median of Kaligonj's other three
      // allocations (850k/1.2M/450k → median 850k), comfortably past the
      // 3x threshold.
      await createAllocation({
        unionId: kaligonjId,
        postedBy: chairmanId,
        projectName: 'Emergency Flood Relief Fund',
        description: 'A single large emergency allocation following unseasonal flooding — deliberately unusual in size.',
        amount: 5_000_000,
        allocationDate: addDays(now, -1),
      });

      // 2. Duplicate beneficiary enrolment — the same (fake, demo-only) NID
      // active in the same programme across two different unions.
      const DEMO_DUPLICATE_NID = '1122334455';
      await enrollBeneficiary({
        nidNumber: DEMO_DUPLICATE_NID,
        unionId: kaligonjId,
        programCode: 'widow-allowance',
        programName: 'Widow Allowance',
        programNameBn: 'বিধবা ভাতা',
        enrolledBy: chairmanId,
        amount: 650,
        period: 'monthly',
      });
      const mominpurIdForDuplicate = unionIds.get('rangpur-sadar-mominpur');
      if (mominpurStaffId && mominpurIdForDuplicate) {
        await enrollBeneficiary({
          nidNumber: DEMO_DUPLICATE_NID,
          unionId: mominpurIdForDuplicate,
          programCode: 'widow-allowance',
          programName: 'Widow Allowance',
          programNameBn: 'বিধবা ভাতা',
          enrolledBy: mominpurStaffId,
          amount: 650,
          period: 'monthly',
        });
      }

      // 3. Overpaid disbursement — a (fake, demo-only) beneficiary whose
      // single disbursement exceeds their entitlement's stated amount. Also,
      // like #2 above, correctly trips the ghost-beneficiary check (SJ-19):
      // neither demo NID belongs to any account that ever verified it.
      const DEMO_OVERPAY_NID = '2233445566';
      const overpayEnrollment = await enrollBeneficiary({
        nidNumber: DEMO_OVERPAY_NID,
        unionId: kaligonjId,
        programCode: 'elderly-allowance',
        programName: 'Elderly Allowance',
        programNameBn: 'বয়স্ক ভাতা',
        enrolledBy: chairmanId,
        amount: 500,
        period: 'monthly',
      });
      await recordDisbursement({
        entitlementId: overpayEnrollment.entitlement.id,
        amount: 800,
        scheduledFor: addDays(now, -2),
        status: 'paid',
        recordedBy: chairmanId,
      });

      // 4. Stale escalation — backdated directly (escalateAllocation always
      // stamps `createdAt` as "now"), since SJ-17/18's flow has no other way
      // to produce an escalation that has already been sitting unresolved
      // for two weeks the moment the demo starts.
      await db
        .update(s.escalations)
        .set({ createdAt: addDays(now, -20) })
        .where(eq(s.escalations.allocationId, suspectAllocation.id));
    }

    // A second union in the SAME upazila, so an upazila officer's rollup
    // (SJ-29) actually aggregates more than one union instead of trivially
    // matching the single-union view.
    const mominpurId = unionIds.get('rangpur-sadar-mominpur');
    if (mominpurStaffId && mominpurId) {
      console.log('  a second union\'s allocation and issue, for the upazila rollup…');
      await createAllocation({
        unionId: mominpurId,
        postedBy: mominpurStaffId,
        projectName: 'Mominpur Primary School Boundary Wall',
        description: 'Constructing a boundary wall around the union primary school for student safety.',
        amount: 380_000,
        allocationDate: addDays(now, -7),
      });

      const [mominpurIssue] = await db
        .insert(s.issues)
        .values({
          reporterId: mominpurStaffId,
          unionId: mominpurId,
          category: 'electricity',
          title: 'Frequent power outages in the ward market',
          description: 'The market area loses power for hours most evenings, affecting shopkeepers after dusk.',
          lat: 25.709,
          lng: 89.241,
          status: 'under_review',
        })
        .returning();
      await db.insert(s.issueStatusHistory).values({
        issueId: mominpurIssue!.id,
        fromStatus: null,
        toStatus: 'under_review',
        changedBy: mominpurStaffId,
      });
    }
  } else {
    console.log('  demo accounts already present (pass --reset-users to recreate)');
  }

  // --------------------------------------------------------- summary
  const [orgCount] = await db.select({ n: s.sql<number>`count(*)` }).from(s.organizations);
  const [oppCount] = await db.select({ n: s.sql<number>`count(*)` }).from(s.opportunities);
  const [locCount] = await db.select({ n: s.sql<number>`count(*)` }).from(s.serviceLocations);
  const [edgeCount] = await db.select({ n: s.sql<number>`count(*)` }).from(s.knowledgeGraphEdges);
  const [unionCount] = await db.select({ n: s.sql<number>`count(*)` }).from(s.unionBoundaries);
  const [issueCount] = await db.select({ n: s.sql<number>`count(*)` }).from(s.issues);
  const [allocationCount] = await db.select({ n: s.sql<number>`count(*)` }).from(s.budgetAllocations);
  const [escalationCount] = await db.select({ n: s.sql<number>`count(*)` }).from(s.escalations);
  const [beneficiaryCount] = await db.select({ n: s.sql<number>`count(*)` }).from(s.beneficiaries);
  const [ledgerCount] = await db.select({ n: s.sql<number>`count(*)` }).from(s.ledgerEntries);
  const [donorOrgCount] = await db.select({ n: s.sql<number>`count(*)` }).from(s.donorOrganizations);

  console.log('\nSeed complete:');
  console.log(`  union boundaries    ${unionCount?.n ?? 0}`);
  console.log(`  issue reports       ${issueCount?.n ?? 0}`);
  console.log(`  budget allocations  ${allocationCount?.n ?? 0}`);
  console.log(`  escalations         ${escalationCount?.n ?? 0}`);
  console.log(`  beneficiaries       ${beneficiaryCount?.n ?? 0}`);
  console.log(`  ledger entries      ${ledgerCount?.n ?? 0}`);
  console.log(`  donor organisations ${donorOrgCount?.n ?? 0}`);
  console.log(`  organisations       ${orgCount?.n ?? 0}`);
  console.log(`  programmes          ${oppCount?.n ?? 0}`);
  console.log(`  retrieval chunks    ${chunkCount}`);
  console.log(`  service locations   ${locCount?.n ?? 0}`);
  console.log(`  graph edges         ${edgeCount?.n ?? 0}`);
  console.log('\nDemo sign-in (phone + PIN):');
  console.log('  01712345678 / 1234  — Rahima Begum, widow, Rangpur (bn) — beneficiary + verified');
  console.log('  01812345678 / 1234  — Tanvir Ahmed, student, Rajshahi (en)');
  console.log('  01912345678 / 1234  — Karim Mia, farmer, Kurigram (bn)');
  console.log('  01711112222 / 1234  — Mina Aktar, Kaligonj resident (bn)');
  console.log('  01911112222 / 1234  — Md. Jashim Uddin, Kaligonj chairman (bn)');
  console.log('  01611112222 / 1234  — Nazma Sultana, Rangpur Sadar upazila officer (bn)');
  console.log('  01411112222 / 1234  — Sohel Rana, Mominpur union staff (bn)');
  console.log('  01511112222 / 1234  — Nasreen Chowdhury, UNDP donor representative (en)');
  console.log('  01612345678 / 4321  — Moderator');
  console.log('  01512345678 / 4321  — Administrator');
  console.log('\nEvery programme is flagged "unverified_sample". See docs/DEVIATIONS.md §2.\n');
}

main()
  .then(() => sqlClient.close())
  .catch((error) => {
    console.error('\nSeed failed:', error);
    sqlClient.close();
    process.exit(1);
  });
