import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../l10n/generated/app_localizations.dart';
import '../domain/opportunity.dart';

String categoryLabel(AppLocalizations l, String slug) => switch (slug) {
      'scholarship' => l.catScholarship,
      'healthcare' => l.catHealthcare,
      'agriculture' => l.catAgriculture,
      'business' => l.catBusiness,
      'legal_aid' => l.catLegalAid,
      'employment' => l.catEmployment,
      'financial' => l.catFinancial,
      'social_welfare' => l.catSocialWelfare,
      'training' => l.catTraining,
      'disaster' => l.catDisaster,
      'research' => l.catResearch,
      _ => slug,
    };

String verificationLabel(AppLocalizations l, String status) => switch (status) {
      'verified' => l.verifVerified,
      'pending_review' => l.verifPending,
      'outdated' => l.verifOutdated,
      'disputed' => l.verifDisputed,
      _ => l.verifUnverified,
    };

String confidenceLabel(AppLocalizations l, String band) => switch (band) {
      'high' => l.confHigh,
      'medium' => l.confMedium,
      _ => l.confLow,
    };

String outcomeLabel(AppLocalizations l, EligibilityOutcome o) => switch (o) {
      EligibilityOutcome.eligible => l.eligEligible,
      EligibilityOutcome.partiallyEligible => l.eligPartial,
      EligibilityOutcome.notEligible => l.eligNotEligible,
      EligibilityOutcome.unknown => l.eligUnknown,
    };

/// Colour AND an icon carry the outcome, so it never relies on colour alone.
({Color color, IconData icon}) outcomeStyle(ColorScheme scheme, EligibilityOutcome o) => switch (o) {
      EligibilityOutcome.eligible => (color: const Color(0xFF1B7F3B), icon: Icons.check_circle),
      EligibilityOutcome.partiallyEligible => (color: const Color(0xFF9A6700), icon: Icons.timelapse),
      EligibilityOutcome.notEligible => (color: scheme.error, icon: Icons.cancel),
      EligibilityOutcome.unknown => (color: scheme.outline, icon: Icons.help),
    };

/// "৳ ৭০০ / মাস" in Bangla, "৳700 / month" in English. Null when the
/// programme has no fixed money amount (services, training, etc).
String? benefitText(AppLocalizations l, Locale locale, int? amount, String? period) {
  if (amount == null || amount <= 0) return null;
  final formatted = '৳${NumberFormat.decimalPattern(locale.languageCode).format(amount)}';
  return switch (period) {
    'monthly' => l.perMonth(formatted),
    'quarterly' => l.perQuarter(formatted),
    'one_time' => l.oneTime(formatted),
    _ => l.amountOnly(formatted),
  };
}

String formatDate(Locale locale, DateTime date) =>
    DateFormat.yMMMd(locale.languageCode).format(date.toLocal());
