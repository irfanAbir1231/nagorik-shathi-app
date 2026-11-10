import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/application/auth_controller.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/chat/presentation/chat_screen.dart';
import '../features/home/home_screen.dart';
import '../features/opportunities/presentation/opportunities_screen.dart';
import '../features/opportunities/presentation/opportunity_detail_screen.dart';
import '../features/plans/presentation/plan_detail_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/saved/presentation/my_list_screen.dart';
import '../l10n/generated/app_localizations.dart';

abstract final class Routes {
  static const home = '/';
  static const opportunities = '/opportunities';
  static const chat = '/chat';
  static const myList = '/my-list';
  static const profile = '/profile';
  static const login = '/login';
  static String opportunity(String slug) => '/opportunity/$slug';
}

final routerProvider = Provider<GoRouter>((ref) {
  // go_router re-evaluates `redirect` whenever this notifier fires.
  final refresh = ValueNotifier<int>(0);
  ref.listen(authControllerProvider, (_, _) => refresh.value++);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: Routes.home,
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      if (auth.isLoading) return null; // splash is shown by the app builder
      final signedIn = auth.value != null;
      final onLogin = state.matchedLocation == Routes.login;
      if (!signedIn && !onLogin) return Routes.login;
      if (signedIn && onLogin) return Routes.home;
      return null;
    },
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => _Shell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [GoRoute(path: Routes.home, builder: (_, _) => const HomeScreen())]),
          StatefulShellBranch(
            routes: [GoRoute(path: Routes.opportunities, builder: (_, _) => const OpportunitiesScreen())],
          ),
          StatefulShellBranch(routes: [GoRoute(path: Routes.chat, builder: (_, _) => const ChatScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: Routes.myList, builder: (_, _) => const MyListScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: Routes.profile, builder: (_, _) => const ProfileScreen())]),
        ],
      ),
      // Outside the shell so the detail page is full-screen with a back button.
      GoRoute(
        path: '/opportunity/:slug',
        builder: (_, state) => OpportunityDetailScreen(slug: state.pathParameters['slug']!),
      ),
      GoRoute(
        path: '/plan/:id',
        builder: (_, state) => PlanDetailScreen(planId: state.pathParameters['id']!),
      ),
      GoRoute(path: Routes.login, builder: (_, _) => const LoginScreen()),
    ],
  );
});

class _Shell extends StatelessWidget {
  const _Shell({required this.shell});
  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return Scaffold(
      body: shell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: shell.currentIndex,
        // Tapping the active tab returns to that tab's root.
        onDestinationSelected: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
        destinations: [
          NavigationDestination(icon: const Icon(Icons.home_outlined), selectedIcon: const Icon(Icons.home), label: l.navHome),
          NavigationDestination(
              icon: const Icon(Icons.search), selectedIcon: const Icon(Icons.manage_search), label: l.navOpportunities),
          NavigationDestination(
              icon: const Icon(Icons.chat_bubble_outline), selectedIcon: const Icon(Icons.chat_bubble), label: l.navAsk),
          NavigationDestination(
              icon: const Icon(Icons.bookmark_border), selectedIcon: const Icon(Icons.bookmark), label: l.navSaved),
          NavigationDestination(
              icon: const Icon(Icons.person_outline), selectedIcon: const Icon(Icons.person), label: l.navProfile),
        ],
      ),
    );
  }
}
