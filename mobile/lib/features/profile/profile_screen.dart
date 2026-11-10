import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../l10n/generated/app_localizations.dart';
import '../auth/application/auth_controller.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final user = ref.watch(authControllerProvider).value;
    return Scaffold(
      appBar: AppBar(title: Text(l.profileTitle)),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        if (user != null) ...[
          Text(user.name, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text(l.phoneValue(user.phone)),
          if (user.district != null) Text(l.districtValue(user.district!)),
        ],
        const SizedBox(height: 24),
        OutlinedButton.icon(
          onPressed: () => ref.read(authControllerProvider.notifier).logout(),
          icon: const Icon(Icons.logout),
          label: Text(l.signOut),
        ),
      ]),
    );
  }
}
