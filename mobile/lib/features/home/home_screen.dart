import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../l10n/generated/app_localizations.dart';
import '../auth/application/auth_controller.dart';

/// Placeholder landing screen. Real citizen screens (dashboard, opportunities,
/// chat, ...) arrive in later phases; this proves sign-in, the bearer-token
/// round trip and sign-out end to end.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final user = ref.watch(authControllerProvider).value;
    return Scaffold(
      appBar: AppBar(
        title: Text(l.appName),
        actions: [
          TextButton(
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
            child: Text(l.signOut),
          ),
        ],
      ),
      body: Center(
        child: Text(
          user == null ? '' : l.welcomeUser(user.name),
          style: Theme.of(context).textTheme.headlineSmall,
        ),
      ),
    );
  }
}
