import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/error_text.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../opportunities/presentation/labels.dart';
import '../../opportunities/presentation/opportunities_screen.dart' show ErrorRetry;
import '../application/plan_controller.dart';
import '../domain/plan.dart';

class PlanDetailScreen extends ConsumerWidget {
  const PlanDetailScreen({super.key, required this.planId});
  final String planId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context);
    final async = ref.watch(planControllerProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l.planTitle)),
      body: async.when(
        skipLoadingOnReload: true,
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorRetry(error: e, onRetry: () => ref.invalidate(planControllerProvider)),
        data: (plans) {
          final plan = plans.where((p) => p.id == planId).firstOrNull;
          if (plan == null) return Center(child: Text(l.noResults));
          return ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 32), children: [
            Text(plan.title.of(locale), style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            LinearProgressIndicator(value: plan.progress, minHeight: 8, borderRadius: BorderRadius.circular(4)),
            const SizedBox(height: 6),
            Text(l.progressOf(plan.doneCount, plan.tasks.length)),
            if (plan.opportunitySlug != null)
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: TextButton(
                  onPressed: () => context.push('/opportunity/${plan.opportunitySlug}'),
                  child: Text(l.chatViewProgramme),
                ),
              ),
            const SizedBox(height: 8),
            for (final task in plan.tasks) _TaskTile(planId: plan.id, task: task),
          ]);
        },
      ),
    );
  }
}

class _TaskTile extends ConsumerWidget {
  const _TaskTile({required this.planId, required this.task});
  final String planId;
  final PlanTask task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context);
    final theme = Theme.of(context);

    final meta = [
      switch (task.priority) {
        TaskPriority.high => l.priorityHigh,
        TaskPriority.medium => l.priorityMedium,
        TaskPriority.low => l.priorityLow,
      },
      if (task.dueDate != null) l.dueOn(formatDate(locale, task.dueDate!)),
      if (task.estimatedMinutes != null) l.minutesShort(task.estimatedMinutes!),
    ].join(' · ');

    return CheckboxListTile(
      value: task.isDone,
      controlAffinity: ListTileControlAffinity.leading,
      contentPadding: EdgeInsets.zero,
      title: Text(
        task.title.of(locale),
        style: task.isDone ? const TextStyle(decoration: TextDecoration.lineThrough) : null,
      ),
      subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (task.description != null) Text(task.description!.of(locale)),
        Text(meta, style: theme.textTheme.bodySmall),
      ]),
      secondary: task.priority == TaskPriority.high && !task.isDone
          ? Icon(Icons.priority_high, color: theme.colorScheme.error, semanticLabel: l.priorityHigh)
          : null,
      onChanged: (checked) async {
        final messenger = ScaffoldMessenger.of(context);
        final error = await ref
            .read(planControllerProvider.notifier)
            .setTaskStatus(planId, task.id, checked == true ? TaskStatus.done : TaskStatus.pending);
        if (error != null) {
          messenger
            ..hideCurrentSnackBar()
            ..showSnackBar(SnackBar(content: Text('${l.taskUpdateFailed} ${errorText(l, error)}')));
        }
      },
    );
  }
}
