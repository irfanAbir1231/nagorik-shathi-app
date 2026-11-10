import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/error_text.dart';

import '../../../l10n/generated/app_localizations.dart';
import '../../plans/application/plan_controller.dart';
import '../../saved/application/saved_controller.dart';
import '../application/opportunity_providers.dart';
import '../domain/opportunity.dart';
import 'labels.dart';
import 'opportunities_screen.dart' show ErrorRetry;
import 'opportunity_card.dart' show OutcomeChip;

class OpportunityDetailScreen extends ConsumerWidget {
  const OpportunityDetailScreen({super.key, required this.slug});
  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(opportunityDetailProvider(slug));
    final detail = async.value;
    return Scaffold(
      appBar: AppBar(actions: [if (detail != null) _SaveButton(opportunityId: detail.summary.id)]),
      bottomNavigationBar: detail == null ? null : _PlanBar(opportunityId: detail.summary.id, slug: slug),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorRetry(error: e, onRetry: () => ref.invalidate(opportunityDetailProvider(slug))),
        data: (d) => _DetailBody(detail: d),
      ),
    );
  }
}

class _DetailBody extends StatelessWidget {
  const _DetailBody({required this.detail});
  final OpportunityDetail detail;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context);
    final theme = Theme.of(context);
    final s = detail.summary;
    final money = benefitText(l, locale, s.benefitAmount, s.benefitPeriod);
    final org = s.organization;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
      children: [
        Text(categoryLabel(l, s.category), style: theme.textTheme.labelLarge),
        const SizedBox(height: 4),
        Text(s.title.of(locale), style: theme.textTheme.headlineSmall),
        if (money != null) ...[
          const SizedBox(height: 8),
          Text(money, style: theme.textTheme.titleLarge?.copyWith(color: theme.colorScheme.primary)),
        ],
        if (s.deadline != null) Text(l.deadlineOn(formatDate(locale, s.deadline!))),
        const SizedBox(height: 8),
        _VerificationBanner(status: s.verificationStatus),
        const SizedBox(height: 16),
        _EligibilityCard(detail: detail),
        _Section(title: l.secDescription, child: Text(detail.description.of(locale))),
        if (detail.benefits.of(locale).isNotEmpty)
          _Section(title: l.secBenefits, child: Text(detail.benefits.of(locale))),
        if (detail.steps.isNotEmpty)
          _Section(
            title: l.secHowToApply,
            child: Column(children: [
              for (final step in detail.steps)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: CircleAvatar(radius: 14, child: Text('${step.step}')),
                  title: Text(step.text.of(locale)),
                ),
            ]),
          ),
        if (detail.documents.isNotEmpty)
          _Section(
            title: l.secDocuments,
            child: Column(children: [for (final d in detail.documents) _DocumentTile(doc: d)]),
          ),
        if (org != null)
          _Section(
            title: l.secProvider,
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(org.name.of(locale), style: theme.textTheme.titleSmall),
              if (org.address != null) Text(org.address!.of(locale)),
              if (org.contactPhone != null) Text('${l.phoneLabelShort}: ${org.contactPhone}'),
              if (org.officeHours != null) Text('${l.officeHours}: ${org.officeHours!.of(locale)}'),
              if (detail.processingTime != null) Text('${l.processingTime}: ${detail.processingTime}'),
            ]),
          ),
        _Section(
          title: l.secTrust,
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${confidenceLabel(l, detail.confidenceBand)} (${detail.confidenceScore}%)'),
            for (final r in detail.confidenceReasons) Text('• ${r.of(locale)}'),
          ]),
        ),
      ],
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Semantics(header: true, child: Text(title, style: Theme.of(context).textTheme.titleMedium)),
          const SizedBox(height: 8),
          child,
        ]),
      );
}

/// Honesty first: the app must not present sample or unchecked data as official.
class _VerificationBanner extends StatelessWidget {
  const _VerificationBanner({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    if (status == 'verified') return const SizedBox.shrink();
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: scheme.secondaryContainer, borderRadius: BorderRadius.circular(8)),
      child: Row(children: [
        Icon(Icons.info_outline, size: 18, color: scheme.onSecondaryContainer),
        const SizedBox(width: 8),
        Expanded(
          child: Text(verificationLabel(AppLocalizations.of(context), status),
              style: TextStyle(color: scheme.onSecondaryContainer)),
        ),
      ]),
    );
  }
}

class _EligibilityCard extends StatelessWidget {
  const _EligibilityCard({required this.detail});
  final OpportunityDetail detail;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context);
    final theme = Theme.of(context);
    final rules = detail.rules.where((r) => r.reason != null).toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Semantics(header: true, child: Text(l.secWhyEligible, style: theme.textTheme.titleMedium)),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(child: OutcomeChip(outcome: detail.outcome)),
            Text(l.eligScore(detail.score), style: theme.textTheme.labelLarge),
          ]),
          const SizedBox(height: 8),
          for (final r in rules)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Icon(
                  switch (r.state) {
                    'met' => Icons.check,
                    'failed' => Icons.close,
                    _ => Icons.help_outline,
                  },
                  size: 18,
                  semanticLabel: switch (r.state) {
                    'met' => l.ruleMet,
                    'failed' => l.ruleFailed,
                    _ => l.ruleUnknown,
                  },
                ),
                const SizedBox(width: 8),
                Expanded(child: Text(r.reason!.of(locale))),
              ]),
            ),
        ]),
      ),
    );
  }
}

class _DocumentTile extends StatelessWidget {
  const _DocumentTile({required this.doc});
  final RequiredDocument doc;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context);
    final extra = [
      if (doc.issuedBy != null) doc.issuedBy!.of(locale),
      if (doc.tip != null) '${l.tipLabel}: ${doc.tip!.of(locale)}',
      if (doc.commonMistake != null) '${l.commonMistakeLabel}: ${doc.commonMistake!.of(locale)}',
    ];
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: const Icon(Icons.description_outlined),
      title: Text(doc.name.of(locale)),
      subtitle: extra.isEmpty ? null : Text(extra.join('\n')),
      trailing: Text(doc.required ? l.requiredDoc : l.optionalDoc, style: Theme.of(context).textTheme.labelSmall),
    );
  }
}

/// Bookmark toggle. Removing offers Undo instead of a confirmation prompt.
class _SaveButton extends ConsumerWidget {
  const _SaveButton({required this.opportunityId});
  final String opportunityId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final saved = ref.watch(savedForOpportunityProvider(opportunityId));
    final controller = ref.read(savedControllerProvider.notifier);

    return IconButton(
      tooltip: saved == null ? l.saveProgramme : l.unsaveProgramme,
      icon: Icon(saved == null ? Icons.bookmark_border : Icons.bookmark),
      onPressed: () async {
        final messenger = ScaffoldMessenger.of(context);
        if (saved == null) {
          final error = await controller.save(opportunityId);
          messenger
            ..hideCurrentSnackBar()
            ..showSnackBar(SnackBar(content: Text(error == null ? l.savedToast : errorText(l, error))));
          return;
        }
        final result = await controller.remove(saved.id);
        messenger.hideCurrentSnackBar();
        if (result.error != null) {
          messenger.showSnackBar(SnackBar(content: Text(errorText(l, result.error!))));
        } else if (result.removed != null) {
          messenger.showSnackBar(SnackBar(
            content: Text(l.removedToast),
            action: SnackBarAction(label: l.undo, onPressed: () => controller.undoRemove(result.removed!)),
          ));
        }
      },
    );
  }
}

/// "Make a plan" turns the programme's steps and documents into a checklist; if
/// one already exists the same button opens it instead of creating a duplicate.
class _PlanBar extends ConsumerStatefulWidget {
  const _PlanBar({required this.opportunityId, required this.slug});
  final String opportunityId;
  final String slug;

  @override
  ConsumerState<_PlanBar> createState() => _PlanBarState();
}

class _PlanBarState extends ConsumerState<_PlanBar> {
  bool _busy = false;

  Future<void> _onPressed() async {
    final l = AppLocalizations.of(context);
    final router = GoRouter.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final existing = ref.read(planForOpportunityProvider(widget.slug));
    if (existing != null) {
      router.push('/plan/${existing.id}');
      return;
    }
    setState(() => _busy = true);
    final result = await ref.read(planControllerProvider.notifier).createFor(widget.opportunityId);
    if (!mounted) return;
    setState(() => _busy = false);
    result.when(
      ok: (plan) => router.push('/plan/${plan.id}'),
      err: (e) => messenger.showSnackBar(SnackBar(content: Text(errorText(l, e)))),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final hasPlan = ref.watch(planForOpportunityProvider(widget.slug)) != null;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
        child: FilledButton.icon(
          onPressed: _busy ? null : _onPressed,
          icon: _busy
              ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.checklist),
          label: Text(hasPlan ? l.openPlan : l.makePlan),
        ),
      ),
    );
  }
}
