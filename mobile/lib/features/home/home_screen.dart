import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/generated/app_localizations.dart';
import '../auth/application/auth_controller.dart';
import '../opportunities/application/opportunity_providers.dart';
import '../opportunities/presentation/opportunities_screen.dart' show ErrorRetry;
import '../opportunities/presentation/opportunity_card.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final user = ref.watch(authControllerProvider).value;
    final recommended = ref.watch(recommendedOpportunitiesProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l.appName)),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(recommendedOpportunitiesProvider.future),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
              child: Text(
                user == null ? '' : l.welcomeUser(user.name),
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
              child: Semantics(
                header: true,
                child: Text(l.recommendedForYou, style: Theme.of(context).textTheme.titleMedium),
              ),
            ),
            recommended.when(
              loading: () => const Padding(padding: EdgeInsets.all(32), child: Center(child: CircularProgressIndicator())),
              error: (e, _) => SizedBox(
                height: 200,
                child: ErrorRetry(error: e, onRetry: () => ref.invalidate(recommendedOpportunitiesProvider)),
              ),
              data: (items) => items.isEmpty
                  ? Padding(padding: const EdgeInsets.all(16), child: Text(l.noRecommendations))
                  : Column(children: [
                      for (final item in items)
                        OpportunityCard(item: item, onTap: () => context.push('/opportunity/${item.slug}')),
                    ]),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: OutlinedButton(onPressed: () => context.go('/opportunities'), child: Text(l.browseAll)),
            ),
          ],
        ),
      ),
    );
  }
}
