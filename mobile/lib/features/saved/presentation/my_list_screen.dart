import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/error_text.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../opportunities/presentation/labels.dart';
import '../../opportunities/presentation/opportunities_screen.dart' show ErrorRetry;
import '../../plans/application/plan_controller.dart';
import '../../plans/domain/plan.dart';
import '../application/saved_controller.dart';
import '../domain/saved.dart';
import 'saved_labels.dart';

/// The "My list" tab: what the citizen has saved, and the plans they are working through.
class MyListScreen extends StatelessWidget {
  const MyListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Text(l.navSaved),
          bottom: TabBar(tabs: [Tab(text: l.savedTab), Tab(text: l.plansTab)]),
        ),
        body: const TabBarView(children: [_SavedTab(), _PlansTab()]),
      ),
    );
  }
}

/* ------------------------------------------------------------------ saved */

class _SavedTab extends ConsumerWidget {
  const _SavedTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final async = ref.watch(savedControllerProvider);
    final filter = ref.watch(savedStatusFilterProvider);

    return async.when(
      skipLoadingOnReload: true,
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => ErrorRetry(error: e, onRetry: () => ref.invalidate(savedControllerProvider)),
      data: (all) {
        if (all.isEmpty) return _Empty(text: l.savedEmpty, icon: Icons.bookmark_border);
        final items = filter == null ? all : all.where((i) => i.status == filter).toList();
        // Only offer filters for statuses that have something in them.
        final present = SavedStatus.values.where((s) => all.any((i) => i.status == s)).toList();

        return Column(children: [
          SizedBox(
            height: 52,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: [
                _FilterChip(
                  label: l.allStatuses,
                  selected: filter == null,
                  onSelected: () => ref.read(savedStatusFilterProvider.notifier).set(null),
                ),
                for (final s in present)
                  _FilterChip(
                    label: '${savedStatusLabel(l, s)} (${all.where((i) => i.status == s).length})',
                    selected: filter == s,
                    onSelected: () => ref.read(savedStatusFilterProvider.notifier).set(s),
                  ),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => ref.refresh(savedControllerProvider.future),
              child: ListView.builder(
                physics: const AlwaysScrollableScrollPhysics(),
                itemCount: items.length,
                itemBuilder: (context, i) => _SavedCard(item: items[i]),
              ),
            ),
          ),
        ]);
      },
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({required this.label, required this.selected, required this.onSelected});
  final String label;
  final bool selected;
  final VoidCallback onSelected;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
        child: ChoiceChip(label: Text(label), selected: selected, onSelected: (_) => onSelected()),
      );
}

class _SavedCard extends ConsumerWidget {
  const _SavedCard({required this.item});
  final SavedItem item;

  Future<void> _changeStatus(BuildContext context, WidgetRef ref) async {
    final l = AppLocalizations.of(context);
    final picked = await showModalBottomSheet<SavedStatus>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (ctx) => SafeArea(
        child: ListView(shrinkWrap: true, children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Text(l.changeStatus, style: Theme.of(ctx).textTheme.titleMedium),
          ),
          for (final s in SavedStatus.values)
            ListTile(
              title: Text(savedStatusLabel(l, s)),
              trailing: s == item.status ? const Icon(Icons.check) : null,
              onTap: () => Navigator.of(ctx).pop(s),
            ),
        ]),
      ),
    );
    if (picked == null || picked == item.status || !context.mounted) return;
    final error = await ref.read(savedControllerProvider.notifier).setStatus(item.id, picked);
    if (error != null && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorText(l, error))));
    }
  }

  Future<void> _remove(BuildContext context, WidgetRef ref) async {
    final l = AppLocalizations.of(context);
    final messenger = ScaffoldMessenger.of(context);
    // Taken now, not later: the swiped card is gone from the tree by the time
    // Undo is tapped, and a disposed card's `ref` can no longer be used.
    final controller = ref.read(savedControllerProvider.notifier);
    final result = await controller.remove(item.id);
    if (result.error != null) {
      messenger.showSnackBar(SnackBar(content: Text(errorText(l, result.error!))));
      return;
    }
    final removed = result.removed;
    if (removed == null) return;
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(
        content: Text(l.removedToast),
        action: SnackBarAction(
          label: l.undo,
          onPressed: () => controller.undoRemove(removed),
        ),
      ));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context);
    final theme = Theme.of(context);
    final opp = item.opportunity;
    final money = benefitText(l, locale, opp.benefitAmount, opp.benefitPeriod);

    return Dismissible(
      key: ValueKey(item.id),
      direction: DismissDirection.endToStart,
      background: Container(
        color: theme.colorScheme.errorContainer,
        alignment: AlignmentDirectional.centerEnd,
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Icon(Icons.delete_outline, color: theme.colorScheme.onErrorContainer),
      ),
      // The swipe removes at once and offers Undo, rather than asking "are you
      // sure": a confirmation dialog costs every citizen a tap to protect against
      // a rare slip that Undo already covers.
      onDismissed: (_) => _remove(context, ref),
      child: Card(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => context.push('/opportunity/${opp.slug}'),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(opp.title.of(locale), style: theme.textTheme.titleMedium),
              if (opp.organization != null) Text(opp.organization!.name.of(locale), style: theme.textTheme.bodySmall),
              if (money != null) ...[
                const SizedBox(height: 6),
                Text(money, style: TextStyle(color: theme.colorScheme.primary, fontWeight: FontWeight.w600)),
              ],
              const SizedBox(height: 8),
              ActionChip(
                avatar: const Icon(Icons.flag_outlined, size: 18),
                label: Text(savedStatusLabel(l, item.status)),
                onPressed: () => _changeStatus(context, ref),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}

/* ------------------------------------------------------------------ plans */

class _PlansTab extends ConsumerWidget {
  const _PlansTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final async = ref.watch(planControllerProvider);
    return async.when(
      skipLoadingOnReload: true,
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => ErrorRetry(error: e, onRetry: () => ref.invalidate(planControllerProvider)),
      data: (plans) {
        if (plans.isEmpty) return _Empty(text: l.plansEmpty, icon: Icons.checklist);
        return RefreshIndicator(
          onRefresh: () => ref.refresh(planControllerProvider.future),
          child: ListView.builder(
            physics: const AlwaysScrollableScrollPhysics(),
            itemCount: plans.length,
            itemBuilder: (context, i) => PlanCard(plan: plans[i]),
          ),
        );
      },
    );
  }
}

class PlanCard extends StatelessWidget {
  const PlanCard({super.key, required this.plan});
  final ActionPlan plan;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context);
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/plan/${plan.id}'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(plan.title.of(locale), style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 10),
            Semantics(
              label: l.progressOf(plan.doneCount, plan.tasks.length),
              child: LinearProgressIndicator(value: plan.progress, minHeight: 8, borderRadius: BorderRadius.circular(4)),
            ),
            const SizedBox(height: 6),
            Text(l.progressOf(plan.doneCount, plan.tasks.length), style: Theme.of(context).textTheme.bodySmall),
          ]),
        ),
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty({required this.text, required this.icon});
  final String text;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(icon, size: 48, color: Theme.of(context).colorScheme.outline),
            const SizedBox(height: 12),
            Text(text, textAlign: TextAlign.center),
          ]),
        ),
      );
}
