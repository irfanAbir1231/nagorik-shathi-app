import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shebar_janala_app/core/network/api_client.dart';
import 'package:shebar_janala_app/core/network/api_result.dart';
import 'package:shebar_janala_app/core/providers.dart';
import 'package:shebar_janala_app/features/opportunities/data/opportunity_repository.dart';
import 'package:shebar_janala_app/features/opportunities/domain/opportunity.dart';
import 'package:shebar_janala_app/features/opportunities/presentation/opportunities_screen.dart';
import 'package:shebar_janala_app/core/storage/token_store.dart';
import 'package:shebar_janala_app/l10n/generated/app_localizations.dart';

OpportunitySummary item(int n) => OpportunitySummary(
      id: 'id$n',
      slug: 'prog-$n',
      title: Bilingual('Programme $n', 'কর্মসূচি $n'),
      summary: const Bilingual('Summary', 'সারাংশ'),
      category: 'healthcare',
      verificationStatus: 'verified',
      benefitAmount: 700,
      benefitPeriod: 'monthly',
      eligibility: const EligibilitySummary(outcome: EligibilityOutcome.eligible, score: 100),
    );

class FakeRepo extends OpportunityRepository {
  FakeRepo(this.handler) : super(ApiClient(tokens: MemoryTokenStore()));
  final ApiResult<OpportunityPage> Function(String? query, String? category, int offset) handler;
  final calls = <({String? query, String? category, int offset})>[];

  @override
  Future<ApiResult<OpportunityPage>> list({
    String? query,
    String? category,
    String? outcome,
    int limit = 20,
    int offset = 0,
  }) async {
    calls.add((query: query, category: category, offset: offset));
    return handler(query, category, offset);
  }
}

Widget host(FakeRepo repo, Locale locale) => ProviderScope(
      overrides: [opportunityRepositoryProvider.overrideWithValue(repo)],
      child: MaterialApp(
        locale: locale,
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: const OpportunitiesScreen(),
      ),
    );

void main() {
  testWidgets('shows localised cards with amount and eligibility', (tester) async {
    final repo = FakeRepo((_, _, _) => Ok(OpportunityPage([item(1)])));
    await tester.pumpWidget(host(repo, const Locale('bn')));
    await tester.pumpAndSettle();

    expect(find.text('কর্মসূচি 1'), findsOneWidget);
    expect(find.text('আপনি যোগ্য হতে পারেন'), findsOneWidget);
    expect(find.textContaining('মাস'), findsOneWidget); // "৳৭০০ / মাস"
  });

  testWidgets('a category chip refetches with that category', (tester) async {
    final repo = FakeRepo((_, _, _) => Ok(OpportunityPage([item(1)])));
    await tester.pumpWidget(host(repo, const Locale('en')));
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(ChoiceChip, 'Healthcare'));
    await tester.pumpAndSettle();

    expect(repo.calls.last.category, 'healthcare');
  });

  testWidgets('typing is debounced into a single request', (tester) async {
    final repo = FakeRepo((_, _, _) => Ok(OpportunityPage([item(1)])));
    await tester.pumpWidget(host(repo, const Locale('en')));
    await tester.pumpAndSettle();
    final before = repo.calls.length;

    await tester.enterText(find.byType(TextField), 'w');
    await tester.enterText(find.byType(TextField), 'wi');
    await tester.enterText(find.byType(TextField), 'wid');
    await tester.pumpAndSettle(const Duration(seconds: 1));

    expect(repo.calls.length - before, 1);
    expect(repo.calls.last.query, 'wid');
  });

  testWidgets('a full page triggers loading the next page on scroll', (tester) async {
    final repo = FakeRepo((_, _, offset) =>
        Ok(OpportunityPage(offset == 0 ? List.generate(20, (i) => item(i)) : [item(100)])));
    await tester.pumpWidget(host(repo, const Locale('en')));
    await tester.pumpAndSettle();

    await tester.drag(find.byType(ListView).last, const Offset(0, -6000));
    await tester.pumpAndSettle();

    expect(repo.calls.map((c) => c.offset), containsAllInOrder([0, 20]));
  });

  testWidgets('a failed load shows a localised error with a request id and retries', (tester) async {
    var fail = true;
    final repo = FakeRepo((_, _, _) =>
        fail ? const Err(ErrorCodes.network, 'x', requestId: 'req-9') : Ok(OpportunityPage([item(1)])));
    await tester.pumpWidget(host(repo, const Locale('en')));
    await tester.pumpAndSettle();

    expect(find.text('No connection. Check your internet and try again.'), findsOneWidget);

    fail = false;
    await tester.tap(find.text('Try again'));
    await tester.pumpAndSettle();
    expect(find.text('Programme 1'), findsOneWidget);
  });
}
