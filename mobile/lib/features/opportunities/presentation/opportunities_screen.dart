import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/error_text.dart';
import '../../../core/network/api_result.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../application/opportunity_providers.dart';
import '../domain/opportunity.dart';
import 'labels.dart';
import 'opportunity_card.dart';

/// Shared error block with a retry button.
class ErrorRetry extends StatelessWidget {
  const ErrorRetry({super.key, required this.error, required this.onRetry});
  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final err = error is ApiFailure ? (error as ApiFailure).err : const Err<dynamic>(ErrorCodes.unknown, '');
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(errorText(l, err), textAlign: TextAlign.center),
          if (err.requestId != null) ...[
            const SizedBox(height: 4),
            Text(l.errReference(err.requestId!), style: Theme.of(context).textTheme.bodySmall),
          ],
          const SizedBox(height: 12),
          FilledButton(onPressed: onRetry, child: Text(l.retry)),
        ]),
      ),
    );
  }
}

class OpportunitiesScreen extends ConsumerStatefulWidget {
  const OpportunitiesScreen({super.key});

  @override
  ConsumerState<OpportunitiesScreen> createState() => _OpportunitiesScreenState();
}

class _OpportunitiesScreenState extends ConsumerState<OpportunitiesScreen> {
  final _scroll = ScrollController();
  final _search = TextEditingController();
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(() {
      if (_scroll.position.extentAfter < 400) {
        ref.read(opportunityListProvider.notifier).loadMore();
      }
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _scroll.dispose();
    _search.dispose();
    super.dispose();
  }

  // One request per pause in typing, not one per keystroke: each query runs the
  // server's retriever and counts against the rate limit.
  void _onQueryChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 450), () {
      ref.read(opportunityFiltersProvider.notifier).setQuery(value);
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final filters = ref.watch(opportunityFiltersProvider);
    final list = ref.watch(opportunityListProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l.navOpportunities)),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
          child: TextField(
            controller: _search,
            onChanged: _onQueryChanged,
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText: l.searchHint,
              prefixIcon: const Icon(Icons.search),
              border: const OutlineInputBorder(),
              isDense: true,
            ),
          ),
        ),
        SizedBox(
          height: 48,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            children: [
              _CategoryChip(
                label: l.allCategories,
                selected: filters.category == null,
                onSelected: () => ref.read(opportunityFiltersProvider.notifier).setCategory(null),
              ),
              for (final c in opportunityCategories)
                _CategoryChip(
                  label: categoryLabel(l, c),
                  selected: filters.category == c,
                  onSelected: () => ref.read(opportunityFiltersProvider.notifier).setCategory(c),
                ),
            ],
          ),
        ),
        Expanded(
          child: list.when(
            // Keep showing the old list while a new filter loads, instead of a blank flash.
            skipLoadingOnReload: true,
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => ErrorRetry(error: e, onRetry: () => ref.invalidate(opportunityListProvider)),
            data: (state) {
              if (state.items.isEmpty) return Center(child: Text(l.noResults));
              return RefreshIndicator(
                onRefresh: () => ref.refresh(opportunityListProvider.future),
                child: ListView.builder(
                  controller: _scroll,
                  physics: const AlwaysScrollableScrollPhysics(),
                  itemCount: state.items.length + (state.hasMore || state.moreError != null ? 1 : 0),
                  itemBuilder: (context, i) {
                    if (i == state.items.length) return _ListFooter(state: state);
                    final item = state.items[i];
                    return OpportunityCard(item: item, onTap: () => context.push('/opportunity/${item.slug}'));
                  },
                ),
              );
            },
          ),
        ),
      ]),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({required this.label, required this.selected, required this.onSelected});
  final String label;
  final bool selected;
  final VoidCallback onSelected;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
        child: ChoiceChip(label: Text(label), selected: selected, onSelected: (_) => onSelected()),
      );
}

class _ListFooter extends ConsumerWidget {
  const _ListFooter({required this.state});
  final OpportunityListState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    if (state.moreError != null) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          Text(l.loadMoreFailed),
          TextButton(onPressed: () => ref.read(opportunityListProvider.notifier).loadMore(), child: Text(l.retry)),
        ]),
      );
    }
    return const Padding(
      padding: EdgeInsets.all(16),
      child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
    );
  }
}
