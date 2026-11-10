import 'package:flutter/material.dart';

import '../../../l10n/generated/app_localizations.dart';
import '../domain/opportunity.dart';
import 'labels.dart';

class OutcomeChip extends StatelessWidget {
  const OutcomeChip({super.key, required this.outcome});
  final EligibilityOutcome outcome;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final style = outcomeStyle(Theme.of(context).colorScheme, outcome);
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(style.icon, size: 18, color: style.color),
      const SizedBox(width: 4),
      Flexible(
        child: Text(
          outcomeLabel(l, outcome),
          style: TextStyle(color: style.color, fontWeight: FontWeight.w600),
        ),
      ),
    ]);
  }
}

class OpportunityCard extends StatelessWidget {
  const OpportunityCard({super.key, required this.item, required this.onTap});
  final OpportunitySummary item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context);
    final theme = Theme.of(context);
    final money = benefitText(l, locale, item.benefitAmount, item.benefitPeriod);
    final elig = item.eligibility;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(categoryLabel(l, item.category), style: theme.textTheme.labelMedium),
            const SizedBox(height: 4),
            Text(item.title.of(locale), style: theme.textTheme.titleMedium),
            const SizedBox(height: 6),
            Text(item.summary.of(locale), maxLines: 3, overflow: TextOverflow.ellipsis),
            if (money != null) ...[
              const SizedBox(height: 8),
              Text(money, style: theme.textTheme.titleSmall?.copyWith(color: theme.colorScheme.primary)),
            ],
            if (item.deadline != null) ...[
              const SizedBox(height: 4),
              Text(l.deadlineOn(formatDate(locale, item.deadline!)), style: theme.textTheme.bodySmall),
            ],
            if (elig != null) ...[
              const SizedBox(height: 10),
              OutcomeChip(outcome: elig.outcome),
            ],
          ]),
        ),
      ),
    );
  }
}
