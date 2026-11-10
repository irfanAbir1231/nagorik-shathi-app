import 'dart:ui';

import 'package:flutter_test/flutter_test.dart';
import 'package:shebar_janala_app/features/opportunities/domain/opportunity.dart';

// Trimmed from a real `GET /opportunities` and `GET /opportunities/widow-allowance` response.
const _listItem = {
  'id': '195262f9',
  'slug': 'widow-allowance',
  'title': 'Widow Allowance',
  'titleBn': 'বিধবা ভাতা',
  'summary': 'A monthly allowance.',
  'summaryBn': '',
  'category': 'social_welfare',
  'benefitAmount': 700,
  'benefitPeriod': 'monthly',
  'deadline': null,
  'verificationStatus': 'pending_review',
  'organization': {'name': 'Department of Social Services', 'nameBn': 'সমাজসেবা অধিদফতর'},
  'eligibility': {
    'outcome': 'partially_eligible',
    'score': 60,
    'topReason': {'en': 'You are a woman.', 'bn': 'আপনি একজন মহিলা।'},
    'topBlocker': null,
  },
  'confidence': {'score': 75, 'band': 'medium'},
};

void main() {
  const bn = Locale('bn');
  const en = Locale('en');

  test('parses a list item', () {
    final item = OpportunitySummary.fromJson(_listItem);
    expect(item.slug, 'widow-allowance');
    expect(item.benefitAmount, 700);
    expect(item.deadline, isNull);
    expect(item.eligibility!.outcome, EligibilityOutcome.partiallyEligible);
    expect(item.eligibility!.topBlocker, isNull);
    expect(item.organization!.name.of(bn), 'সমাজসেবা অধিদফতর');
  });

  test('falls back to the other language when a translation is missing', () {
    final item = OpportunitySummary.fromJson(_listItem);
    expect(item.title.of(bn), 'বিধবা ভাতা');
    expect(item.summary.of(bn), 'A monthly allowance.'); // summaryBn is empty
    expect(item.title.of(en), 'Widow Allowance');
  });

  test('an unknown outcome string degrades to unknown instead of throwing', () {
    expect(EligibilityOutcome.parse('something_new'), EligibilityOutcome.unknown);
    expect(EligibilityOutcome.parse(null), EligibilityOutcome.unknown);
  });

  test('parses a detail response and tolerates absent optional sections', () {
    final detail = OpportunityDetail.fromJson({
      'opportunity': {
        ..._listItem,
        'description': 'Long text',
        'descriptionBn': 'দীর্ঘ লেখা',
        'benefits': 'Cash',
        'benefitsBn': '',
        'applicationProcess': [
          {'step': 1, 'en': 'Get a certificate.', 'bn': 'প্রত্যয়নপত্র নিন।'},
        ],
        'officialUrl': 'https://dss.gov.bd',
      },
      'organization': _listItem['organization'],
      'documents': [
        {'name': 'NID', 'nameBn': 'এনআইডি', 'required': true, 'tip': null, 'tipBn': null},
      ],
      'eligibility': {
        'outcome': 'eligible',
        'score': 100,
        'ruleCoverage': 100,
        'missingFields': <String>[],
        'matched': [
          {'state': 'met', 'soft': false, 'reason': {'en': 'You are a woman.', 'bn': 'আপনি একজন মহিলা।'}},
        ],
        'failed': <Object>[],
        'unknown': [
          {'state': 'unknown', 'soft': true, 'reason': null},
        ],
      },
      'confidence': {
        'score': 75,
        'band': 'medium',
        'reasons': [
          {'en': 'Official source.', 'bn': 'সরকারি উৎস।'},
        ],
      },
      // no nearbyOffices key at all
    });

    expect(detail.outcome, EligibilityOutcome.eligible);
    expect(detail.steps.single.text.of(bn), 'প্রত্যয়নপত্র নিন।');
    expect(detail.documents.single.required, isTrue);
    expect(detail.rules.map((r) => r.state), ['met', 'unknown']);
    expect(detail.confidenceReasons.single.of(en), 'Official source.');
    expect(detail.nearbyOffices, isEmpty);
  });
}
