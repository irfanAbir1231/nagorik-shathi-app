import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shebar_janala_app/core/network/api_client.dart';
import 'package:shebar_janala_app/core/network/api_result.dart';
import 'package:shebar_janala_app/core/providers.dart';
import 'package:shebar_janala_app/core/storage/token_store.dart';
import 'package:shebar_janala_app/features/plans/application/plan_controller.dart';
import 'package:shebar_janala_app/features/plans/data/plan_repository.dart';
import 'package:shebar_janala_app/features/plans/domain/plan.dart';
import 'package:shebar_janala_app/features/plans/presentation/plan_detail_screen.dart';
import 'package:shebar_janala_app/features/saved/application/saved_controller.dart';
import 'package:shebar_janala_app/features/saved/data/saved_repository.dart';
import 'package:shebar_janala_app/features/saved/domain/saved.dart';
import 'package:shebar_janala_app/features/saved/presentation/my_list_screen.dart';
import 'package:shebar_janala_app/l10n/generated/app_localizations.dart';

// Trimmed from real `GET /saved` and `POST /action-plans` responses.
Map<String, dynamic> savedJson(String id, String status, {String slug = 'widow-allowance'}) => {
      'saved': {'id': id, 'status': status, 'note': null, 'savedAt': '2026-11-10T06:44:57.331Z'},
      'opportunity': {
        'id': 'opp-$id',
        'slug': slug,
        'title': 'Widow Allowance $id',
        'titleBn': 'বিধবা ভাতা $id',
        'summary': 'A monthly allowance.',
        'summaryBn': 'মাসিক ভাতা',
        'category': 'social_welfare',
        'benefitAmount': 700,
        'benefitPeriod': 'monthly',
        'verificationStatus': 'pending_review',
      },
      'organization': {'name': 'Social Services', 'nameBn': 'সমাজসেবা'},
    };

Map<String, dynamic> taskJson(String id, int order, {String status = 'pending'}) => {
      'id': id,
      'title': 'Collect: NID $id',
      'titleBn': 'সংগ্রহ: এনআইডি $id',
      'description': 'Issued by Election Commission.',
      'dueDate': '2026-11-09T18:00:00.000Z',
      'priority': 'high',
      'estimatedMinutes': 90,
      'status': status,
      'sortOrder': order,
    };

ActionPlan makePlan() => ActionPlan.fromJson(
      {'id': 'plan-1', 'title': 'Apply for Widow Allowance', 'titleBn': 'আবেদন'},
      [taskJson('t2', 1), taskJson('t1', 0)],
      {'slug': 'widow-allowance'},
    );

class FakeSavedRepo extends SavedRepository {
  FakeSavedRepo(this.items) : super(ApiClient(tokens: MemoryTokenStore()));
  List<Map<String, dynamic>> items;
  bool failWrites = false;
  final saves = <({String opportunityId, SavedStatus status})>[];
  final removed = <String>[];

  @override
  Future<ApiResult<List<SavedItem>>> list() async => Ok([for (final i in items) SavedItem.fromJson(i)]);

  @override
  Future<ApiResult<String>> save(String opportunityId, {SavedStatus status = SavedStatus.interested, String? note}) async {
    if (failWrites) return const Err(ErrorCodes.network, 'x');
    saves.add((opportunityId: opportunityId, status: status));
    items = [...items, savedJson('new${saves.length}', status.wire)];
    return Ok('new${saves.length}');
  }

  @override
  Future<ApiResult<void>> setStatus(String savedId, SavedStatus status) async =>
      failWrites ? const Err(ErrorCodes.network, 'x') : const Ok(null);

  @override
  Future<ApiResult<void>> remove(String savedId) async {
    if (failWrites) return const Err(ErrorCodes.network, 'x');
    removed.add(savedId);
    items = items.where((i) => (i['saved'] as Map)['id'] != savedId).toList();
    return const Ok(null);
  }
}

class FakePlanRepo extends PlanRepository {
  FakePlanRepo(this.plans) : super(ApiClient(tokens: MemoryTokenStore()));
  List<ActionPlan> plans;
  bool failWrites = false;
  final updates = <({String taskId, TaskStatus status})>[];

  @override
  Future<ApiResult<List<ActionPlan>>> list() async => Ok(plans);

  @override
  Future<ApiResult<ActionPlan>> create(String opportunityId) async => Ok(makePlan());

  @override
  Future<ApiResult<void>> setTaskStatus(String taskId, TaskStatus status) async {
    if (failWrites) return const Err(ErrorCodes.network, 'x');
    updates.add((taskId: taskId, status: status));
    return const Ok(null);
  }
}

Widget host(Widget home, {FakeSavedRepo? saved, FakePlanRepo? plans, Locale locale = const Locale('en')}) {
  return ProviderScope(
    overrides: [
      if (saved != null) savedRepositoryProvider.overrideWithValue(saved),
      if (plans != null) planRepositoryProvider.overrideWithValue(plans),
    ],
    child: MaterialApp(
      locale: locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: home,
    ),
  );
}

void main() {
  group('models', () {
    test('parses a saved entry and merges the organisation into the programme', () {
      final item = SavedItem.fromJson(savedJson('s1', 'documents_ready'));
      expect(item.status, SavedStatus.documentsReady);
      expect(item.opportunity.slug, 'widow-allowance');
      expect(item.opportunity.organization!.name.en, 'Social Services');
    });

    test('an unknown status degrades instead of throwing', () {
      expect(SavedStatus.parse('something_new'), SavedStatus.interested);
      expect(TaskStatus.parse(null), TaskStatus.pending);
    });

    test('a plan sorts its tasks and computes progress', () {
      final plan = makePlan();
      expect(plan.tasks.map((t) => t.id), ['t1', 't2']); // by sortOrder
      expect(plan.progress, 0);
      final updated = plan.withTask('t1', TaskStatus.done);
      expect(updated.doneCount, 1);
      expect(updated.progress, 0.5);
      expect(plan.doneCount, 0); // immutable
    });
  });

  group('SavedController', () {
    ProviderContainer make(FakeSavedRepo repo) {
      final c = ProviderContainer(overrides: [savedRepositoryProvider.overrideWithValue(repo)]);
      addTearDown(c.dispose);
      return c;
    }

    test('status change shows at once and rolls back when the server refuses', () async {
      final repo = FakeSavedRepo([savedJson('s1', 'interested')]);
      final c = make(repo);
      await c.read(savedControllerProvider.future);

      repo.failWrites = true;
      final error = await c.read(savedControllerProvider.notifier).setStatus('s1', SavedStatus.applied);

      expect(error!.code, ErrorCodes.network);
      expect(c.read(savedControllerProvider).value!.single.status, SavedStatus.interested);
    });

    test('remove returns the item for Undo, and undo restores its status', () async {
      final repo = FakeSavedRepo([savedJson('s1', 'preparing')]);
      final c = make(repo);
      await c.read(savedControllerProvider.future);
      final ctl = c.read(savedControllerProvider.notifier);

      final result = await ctl.remove('s1');
      expect(c.read(savedControllerProvider).value, isEmpty);
      expect(result.removed!.status, SavedStatus.preparing);

      await ctl.undoRemove(result.removed!);
      expect(repo.saves.last.status, SavedStatus.preparing);
      expect(c.read(savedControllerProvider).value, hasLength(1));
    });

    test('a failed remove puts the item back', () async {
      final repo = FakeSavedRepo([savedJson('s1', 'interested')]);
      final c = make(repo);
      await c.read(savedControllerProvider.future);

      repo.failWrites = true;
      final result = await c.read(savedControllerProvider.notifier).remove('s1');

      expect(result.error, isNotNull);
      expect(c.read(savedControllerProvider).value, hasLength(1));
    });

    test('savedForOpportunity finds the record by programme id', () async {
      final repo = FakeSavedRepo([savedJson('s1', 'interested')]);
      final c = make(repo);
      await c.read(savedControllerProvider.future);
      expect(c.read(savedForOpportunityProvider('opp-s1'))!.id, 's1');
      expect(c.read(savedForOpportunityProvider('other')), isNull);
    });
  });

  group('PlanController', () {
    test('a task tick shows at once and reverts if the server refuses', () async {
      final repo = FakePlanRepo([makePlan()]);
      final c = ProviderContainer(overrides: [planRepositoryProvider.overrideWithValue(repo)]);
      addTearDown(c.dispose);
      await c.read(planControllerProvider.future);

      repo.failWrites = true;
      final error = await c.read(planControllerProvider.notifier).setTaskStatus('plan-1', 't1', TaskStatus.done);

      expect(error, isNotNull);
      expect(c.read(planControllerProvider).value!.single.doneCount, 0);
    });
  });

  group('screens', () {
    testWidgets('saved tab lists items with their status and filters by status', (tester) async {
      final repo = FakeSavedRepo([savedJson('s1', 'interested'), savedJson('s2', 'applied', slug: 'other')]);
      await tester.pumpWidget(host(const MyListScreen(), saved: repo, plans: FakePlanRepo([])));
      await tester.pumpAndSettle();

      expect(find.text('Widow Allowance s1'), findsOneWidget);
      expect(find.text('Widow Allowance s2'), findsOneWidget);

      await tester.tap(find.widgetWithText(ChoiceChip, 'Applied (1)'));
      await tester.pumpAndSettle();

      expect(find.text('Widow Allowance s1'), findsNothing);
      expect(find.text('Widow Allowance s2'), findsOneWidget);
    });

    testWidgets('swipe removes with Undo, and Undo brings it back', (tester) async {
      final repo = FakeSavedRepo([savedJson('s1', 'interested')]);
      await tester.pumpWidget(host(const MyListScreen(), saved: repo, plans: FakePlanRepo([])));
      await tester.pumpAndSettle();

      await tester.drag(find.text('Widow Allowance s1'), const Offset(-600, 0));
      await tester.pumpAndSettle();
      expect(find.text('Widow Allowance s1'), findsNothing);
      expect(find.text('Undo'), findsOneWidget);
      expect(repo.removed, ['s1']);

      await tester.tap(find.text('Undo'));
      await tester.pumpAndSettle();
      expect(find.text('Widow Allowance new1'), findsOneWidget);
    });

    testWidgets('empty states explain what to do, in Bangla too', (tester) async {
      await tester.pumpWidget(host(const MyListScreen(),
          saved: FakeSavedRepo([]), plans: FakePlanRepo([]), locale: const Locale('bn')));
      await tester.pumpAndSettle();
      expect(find.textContaining('এখনো কিছু সংরক্ষণ করা হয়নি'), findsOneWidget);
    });

    testWidgets('plans tab shows progress', (tester) async {
      final plan = makePlan().withTask('t1', TaskStatus.done);
      await tester.pumpWidget(host(const MyListScreen(), saved: FakeSavedRepo([]), plans: FakePlanRepo([plan])));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Plans'));
      await tester.pumpAndSettle();

      expect(find.text('Apply for Widow Allowance'), findsOneWidget);
      expect(find.text('1 of 2 done'), findsOneWidget);
    });

    testWidgets('ticking a task updates the checkbox and the server; a failure reverts with a message',
        (tester) async {
      final repo = FakePlanRepo([makePlan()]);
      await tester.pumpWidget(host(const PlanDetailScreen(planId: 'plan-1'), plans: repo));
      await tester.pumpAndSettle();

      await tester.tap(find.byType(Checkbox).first);
      await tester.pumpAndSettle();
      expect(repo.updates.single, (taskId: 't1', status: TaskStatus.done));
      expect(tester.widget<Checkbox>(find.byType(Checkbox).first).value, isTrue);
      expect(find.text('1 of 2 done'), findsOneWidget);

      repo.failWrites = true;
      await tester.tap(find.byType(Checkbox).last);
      await tester.pumpAndSettle();
      expect(tester.widget<Checkbox>(find.byType(Checkbox).last).value, isFalse);
      expect(find.textContaining('Could not update that step'), findsOneWidget);
    });
  });
}
