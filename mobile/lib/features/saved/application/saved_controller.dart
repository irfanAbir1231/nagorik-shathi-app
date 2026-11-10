import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_result.dart';
import '../../../core/providers.dart';
import '../domain/saved.dart';

/// The citizen's saved programmes. Changes show immediately and are rolled back
/// if the server refuses them, so the list never claims something that is not
/// stored.
class SavedController extends AsyncNotifier<List<SavedItem>> {
  @override
  Future<List<SavedItem>> build() async => (await ref.read(savedRepositoryProvider).list()).unwrap();

  /// Saves [opportunityId]. Returns the error, or null on success.
  Future<Err<dynamic>?> save(String opportunityId,
      {SavedStatus status = SavedStatus.interested, String? note}) async {
    final result = await ref.read(savedRepositoryProvider).save(opportunityId, status: status, note: note);
    if (result is Err<String>) return result;
    // Reload rather than guess: the server returns the joined programme data.
    ref.invalidateSelf();
    await future;
    return null;
  }

  Future<Err<dynamic>?> setStatus(String savedId, SavedStatus status) async {
    final before = state.value;
    if (before == null) return null;
    state = AsyncData([for (final i in before) i.id == savedId ? i.copyWith(status: status) : i]);
    final result = await ref.read(savedRepositoryProvider).setStatus(savedId, status);
    if (result is Err<void>) {
      state = AsyncData(before);
      return result;
    }
    return null;
  }

  /// Removes an item. Returns the removed item so the UI can offer "Undo".
  Future<({SavedItem? removed, Err<dynamic>? error})> remove(String savedId) async {
    final before = state.value;
    final item = before?.where((i) => i.id == savedId).firstOrNull;
    if (before == null || item == null) return (removed: null, error: null);
    state = AsyncData([for (final i in before) if (i.id != savedId) i]);
    final result = await ref.read(savedRepositoryProvider).remove(savedId);
    if (result is Err<void>) {
      state = AsyncData(before);
      return (removed: null, error: result);
    }
    return (removed: item, error: null);
  }

  /// Puts back an item removed a moment ago, keeping its status and note.
  Future<Err<dynamic>?> undoRemove(SavedItem item) =>
      save(item.opportunity.id, status: item.status, note: item.note);
}

final savedControllerProvider = AsyncNotifierProvider<SavedController, List<SavedItem>>(SavedController.new);

/// The saved record for a programme, if the citizen saved it.
final savedForOpportunityProvider = Provider.family<SavedItem?, String>((ref, opportunityId) {
  final items = ref.watch(savedControllerProvider).value;
  return items?.where((i) => i.opportunity.id == opportunityId).firstOrNull;
});

class SavedStatusFilter extends Notifier<SavedStatus?> {
  @override
  SavedStatus? build() => null;
  void set(SavedStatus? s) => state = s;
}

final savedStatusFilterProvider = NotifierProvider<SavedStatusFilter, SavedStatus?>(SavedStatusFilter.new);
