import 'dart:ui' show Locale;

/// A string the backend ships in both languages (`title` / `titleBn`, or `{en, bn}`).
class Bilingual {
  const Bilingual(this.en, this.bn);
  final String en;
  final String bn;

  /// Picks the user's language, falling back to the other when it is missing,
  /// so a record with no Bangla translation still shows something.
  String of(Locale locale) {
    final primary = locale.languageCode == 'bn' ? bn : en;
    final fallback = locale.languageCode == 'bn' ? en : bn;
    return primary.isNotEmpty ? primary : fallback;
  }

  static Bilingual? fromPair(Object? en, Object? bn) {
    final e = en is String ? en : '';
    final b = bn is String ? bn : '';
    return (e.isEmpty && b.isEmpty) ? null : Bilingual(e, b);
  }

  static Bilingual? fromObject(Object? json) {
    if (json is Map<String, dynamic>) return fromPair(json['en'], json['bn']);
    return null;
  }
}

enum EligibilityOutcome {
  eligible,
  partiallyEligible,
  notEligible,
  unknown;

  static EligibilityOutcome parse(Object? raw) => switch (raw) {
        'eligible' => eligible,
        'partially_eligible' => partiallyEligible,
        'not_eligible' => notEligible,
        _ => unknown,
      };
}

/// The backend's category slugs (`OPPORTUNITY_CATEGORIES`).
const opportunityCategories = [
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
];

class OrganizationRef {
  const OrganizationRef({required this.name, this.contactPhone, this.address, this.officeHours, this.website});
  final Bilingual name;
  final String? contactPhone;
  final Bilingual? address;
  final Bilingual? officeHours;
  final String? website;

  factory OrganizationRef.fromJson(Map<String, dynamic> j) => OrganizationRef(
        name: Bilingual.fromPair(j['name'], j['nameBn']) ?? const Bilingual('', ''),
        contactPhone: j['contactPhone'] as String?,
        address: Bilingual.fromPair(j['address'], j['addressBn']),
        officeHours: Bilingual.fromPair(j['officeHours'], j['officeHoursBn']),
        website: j['website'] as String?,
      );
}

/// The compact eligibility verdict shown on list cards.
class EligibilitySummary {
  const EligibilitySummary({required this.outcome, required this.score, this.topReason, this.topBlocker});
  final EligibilityOutcome outcome;
  final int score;
  final Bilingual? topReason;
  final Bilingual? topBlocker;

  factory EligibilitySummary.fromJson(Map<String, dynamic> j) => EligibilitySummary(
        outcome: EligibilityOutcome.parse(j['outcome']),
        score: (j['score'] as num?)?.toInt() ?? 0,
        topReason: Bilingual.fromObject(j['topReason']),
        topBlocker: Bilingual.fromObject(j['topBlocker']),
      );
}

class OpportunitySummary {
  const OpportunitySummary({
    required this.id,
    required this.slug,
    required this.title,
    required this.summary,
    required this.category,
    required this.verificationStatus,
    this.benefitAmount,
    this.benefitPeriod,
    this.deadline,
    this.organization,
    this.eligibility,
    this.confidenceBand,
  });

  final String id;
  final String slug;
  final Bilingual title;
  final Bilingual summary;
  final String category;
  final int? benefitAmount;
  final String? benefitPeriod;
  final DateTime? deadline;
  final String verificationStatus;
  final OrganizationRef? organization;
  final EligibilitySummary? eligibility;
  final String? confidenceBand;

  factory OpportunitySummary.fromJson(Map<String, dynamic> j) {
    final org = j['organization'];
    final elig = j['eligibility'];
    final conf = j['confidence'];
    return OpportunitySummary(
      id: j['id'] as String,
      slug: j['slug'] as String,
      title: Bilingual.fromPair(j['title'], j['titleBn']) ?? const Bilingual('', ''),
      summary: Bilingual.fromPair(j['summary'], j['summaryBn']) ?? const Bilingual('', ''),
      category: j['category'] as String? ?? '',
      benefitAmount: (j['benefitAmount'] as num?)?.toInt(),
      benefitPeriod: j['benefitPeriod'] as String?,
      deadline: _date(j['deadline']),
      verificationStatus: j['verificationStatus'] as String? ?? 'unverified_sample',
      organization: org is Map<String, dynamic> ? OrganizationRef.fromJson(org) : null,
      eligibility: elig is Map<String, dynamic> ? EligibilitySummary.fromJson(elig) : null,
      confidenceBand: conf is Map<String, dynamic> ? conf['band'] as String? : null,
    );
  }
}

class OpportunityPage {
  const OpportunityPage(this.items);
  final List<OpportunitySummary> items;
}

/* ------------------------------------------------------------------ detail */

class ApplicationStep {
  const ApplicationStep(this.step, this.text);
  final int step;
  final Bilingual text;
}

class RequiredDocument {
  const RequiredDocument({required this.name, required this.required, this.issuedBy, this.tip, this.commonMistake});
  final Bilingual name;
  final bool required;
  final Bilingual? issuedBy;
  final Bilingual? tip;
  final Bilingual? commonMistake;
}

/// One eligibility rule and how the citizen's profile fared against it.
class RuleResult {
  const RuleResult({required this.state, required this.reason, required this.soft});

  /// 'met', 'failed' or 'unknown' — the bucket the backend placed it in.
  final String state;
  final Bilingual? reason;
  final bool soft;
}

class OpportunityDetail {
  const OpportunityDetail({
    required this.summary,
    required this.description,
    required this.benefits,
    required this.steps,
    required this.documents,
    required this.outcome,
    required this.score,
    required this.ruleCoverage,
    required this.rules,
    required this.missingFields,
    required this.confidenceBand,
    required this.confidenceScore,
    required this.confidenceReasons,
    this.officialUrl,
    this.applyUrl,
    this.processingTime,
    this.sourceNote,
    this.nearbyOffices = const [],
  });

  final OpportunitySummary summary;
  final Bilingual description;
  final Bilingual benefits;
  final List<ApplicationStep> steps;
  final List<RequiredDocument> documents;
  final String? officialUrl;
  final String? applyUrl;
  final String? processingTime;
  final String? sourceNote;

  final EligibilityOutcome outcome;
  final int score;
  final int ruleCoverage;
  final List<RuleResult> rules;
  final List<String> missingFields;

  final String confidenceBand;
  final int confidenceScore;
  final List<Bilingual> confidenceReasons;
  final List<OrganizationRef> nearbyOffices;

  factory OpportunityDetail.fromJson(Map<String, dynamic> data) {
    final opp = data['opportunity'] as Map<String, dynamic>;
    final org = data['organization'];
    final elig = (data['eligibility'] as Map<String, dynamic>?) ?? const {};
    final conf = (data['confidence'] as Map<String, dynamic>?) ?? const {};

    List<RuleResult> rules(String key, String state) => [
          for (final r in (elig[key] as List? ?? const []))
            if (r is Map<String, dynamic>)
              RuleResult(state: state, reason: Bilingual.fromObject(r['reason']), soft: r['soft'] == true),
        ];

    final summaryJson = {...opp, 'organization': org, 'eligibility': elig, 'confidence': conf};

    return OpportunityDetail(
      summary: OpportunitySummary.fromJson(summaryJson),
      description: Bilingual.fromPair(opp['description'], opp['descriptionBn']) ?? const Bilingual('', ''),
      benefits: Bilingual.fromPair(opp['benefits'], opp['benefitsBn']) ?? const Bilingual('', ''),
      steps: [
        for (final s in (opp['applicationProcess'] as List? ?? const []))
          if (s is Map<String, dynamic>)
            ApplicationStep(
              (s['step'] as num?)?.toInt() ?? 0,
              Bilingual.fromPair(s['en'], s['bn']) ?? const Bilingual('', ''),
            ),
      ],
      documents: [
        for (final d in (data['documents'] as List? ?? const []))
          if (d is Map<String, dynamic>)
            RequiredDocument(
              name: Bilingual.fromPair(d['name'], d['nameBn']) ?? const Bilingual('', ''),
              required: d['required'] != false,
              issuedBy: Bilingual.fromPair(d['issuingAuthority'], d['issuingAuthorityBn']),
              tip: Bilingual.fromPair(d['tip'], d['tipBn']),
              commonMistake: Bilingual.fromPair(d['commonMistake'], d['commonMistakeBn']),
            ),
      ],
      officialUrl: opp['officialUrl'] as String?,
      applyUrl: opp['applyUrl'] as String?,
      processingTime: opp['processingTimeDays'] as String?,
      sourceNote: opp['sourceNote'] as String?,
      outcome: EligibilityOutcome.parse(elig['outcome']),
      score: (elig['score'] as num?)?.toInt() ?? 0,
      ruleCoverage: (elig['ruleCoverage'] as num?)?.toInt() ?? 0,
      rules: [...rules('matched', 'met'), ...rules('failed', 'failed'), ...rules('unknown', 'unknown')],
      missingFields: [for (final f in (elig['missingFields'] as List? ?? const [])) '$f'],
      confidenceBand: conf['band'] as String? ?? 'low',
      confidenceScore: (conf['score'] as num?)?.toInt() ?? 0,
      confidenceReasons: [
        for (final r in (conf['reasons'] as List? ?? const []))
          ?Bilingual.fromObject(r),
      ],
      nearbyOffices: [
        for (final o in (data['nearbyOffices'] as List? ?? const []))
          if (o is Map<String, dynamic>) OrganizationRef.fromJson(o),
      ],
    );
  }
}

DateTime? _date(Object? raw) => raw is String ? DateTime.tryParse(raw) : null;
