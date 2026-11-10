import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_result.dart';
import '../../../core/providers.dart';
import '../domain/plan.dart';

class PlanController extends AsyncNotifier<List<ActionPlan>> {
  @override
  Future<List<ActionPlan>> build() async => (await ref.read(planRepositoryProvider).list()).unwrap();

  /// Creates (or fetches the existing) plan for a programme.
  Future<ApiResult<ActionPlan>> createFor(String opportunityId) async {
    final result = await ref.read(planRepositoryProvider).create(opportunityId);
    if (result is Ok<ActionPlan>) {
      ref.invalidateSelf();
      await future;
    }
    return result;
  }

  /// Ticks a task. Updates at once and reverts, returning the error, if the
  /// server refuses; a checklist that silently forgets a tick is worse than none.
  Future<Err<dynamic>?> setTaskStatus(String planId, String taskId, TaskStatus status) async {
    final before = state.value;
    if (before == null) return null;
    state = AsyncData([for (final p in before) p.id == planId ? p.withTask(taskId, status) : p]);
    final result = await ref.read(planRepositoryProvider).setTaskStatus(taskId, status);
    if (result is Err<void>) {
      state = AsyncData(before);
      return result;
    }
    return null;
  }
}

final planControllerProvider = AsyncNotifierProvider<PlanController, List<ActionPlan>>(PlanController.new);

/// The plan for a programme, if one exists.
final planForOpportunityProvider = Provider.family<ActionPlan?, String>((ref, slug) {
  final plans = ref.watch(planControllerProvider).value;
  return plans?.where((p) => p.opportunitySlug == slug).firstOrNull;
});
