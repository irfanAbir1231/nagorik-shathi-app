import '../../../l10n/generated/app_localizations.dart';
import '../domain/saved.dart';

String savedStatusLabel(AppLocalizations l, SavedStatus s) => switch (s) {
      SavedStatus.interested => l.statusInterested,
      SavedStatus.preparing => l.statusPreparing,
      SavedStatus.documentsReady => l.statusDocsReady,
      SavedStatus.applied => l.statusApplied,
      SavedStatus.underReview => l.statusUnderReview,
      SavedStatus.approved => l.statusApproved,
      SavedStatus.rejected => l.statusRejected,
      SavedStatus.completed => l.statusCompleted,
    };
