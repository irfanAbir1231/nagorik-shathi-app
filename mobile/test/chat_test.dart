import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shebar_janala_app/core/network/api_client.dart';
import 'package:shebar_janala_app/core/network/api_result.dart';
import 'package:shebar_janala_app/core/providers.dart';
import 'package:shebar_janala_app/core/storage/token_store.dart';
import 'package:shebar_janala_app/features/chat/application/chat_controller.dart';
import 'package:shebar_janala_app/features/chat/data/chat_repository.dart';
import 'package:shebar_janala_app/features/chat/domain/chat.dart';
import 'package:shebar_janala_app/features/chat/presentation/chat_screen.dart';
import 'package:shebar_janala_app/l10n/generated/app_localizations.dart';

// Trimmed from a real `POST /chat` response.
Map<String, dynamic> turnJson({String conv = 'conv-1', String reply = 'Here is what we found.'}) => {
      'conversationId': conv,
      'userMessage': {'id': 'u1', 'role': 'user', 'kind': 'text', 'content': 'hello', 'createdAt': '2026-11-10T06:35:52.026Z'},
      'assistantMessage': {
        'id': 'a1',
        'role': 'assistant',
        'kind': 'recommendation',
        'content': reply,
        'aiEngine': 'simulated',
        'createdAt': '2026-11-10T06:35:52.071Z',
        'payload': {
          'plan': {
            'opportunities': [
              {
                'slug': 'widow-allowance',
                'title': {'en': 'Widow Allowance', 'bn': 'বিধবা ভাতা'},
                'organisation': {'en': 'Social Services', 'bn': 'সমাজসেবা'},
                'outcome': 'eligible',
                'benefitAmount': 700,
                'benefitPeriod': 'monthly',
                'isUnverified': true,
                'nextStep': {'en': 'Get a certificate.', 'bn': 'প্রত্যয়নপত্র নিন।'},
                'metReasons': [
                  {'en': 'You are a woman.', 'bn': 'আপনি মহিলা।'},
                ],
              },
            ],
          },
        },
      },
    };

class FakeChatRepo extends ChatRepository {
  FakeChatRepo(this.script) : super(ApiClient(tokens: MemoryTokenStore()));
  final List<ApiResult<ChatTurn>> script;
  final sent = <({String message, String? conversationId})>[];

  @override
  Future<ApiResult<ChatTurn>> send({required String message, String? conversationId, String? locale}) async {
    sent.add((message: message, conversationId: conversationId));
    return script.removeAt(0);
  }

  @override
  Future<ApiResult<List<ConversationSummary>>> conversations() async => const Ok([]);
}

ApiResult<ChatTurn> okTurn({String conv = 'conv-1'}) => Ok(ChatTurn.fromJson(turnJson(conv: conv)));

void main() {
  test('parses the embedded programme cards from a real payload', () {
    final turn = ChatTurn.fromJson(turnJson());
    expect(turn.assistant.opportunities.single.slug, 'widow-allowance');
    expect(turn.assistant.opportunities.single.firstReason!.en, 'You are a woman.');
    expect(turn.assistant.isSimulated, isTrue);
    expect(turn.user.role, ChatRole.user);
  });

  test('a message without a payload parses to no cards', () {
    final m = ChatMessage.fromJson({'id': 'x', 'role': 'assistant', 'content': 'Hi', 'payload': null});
    expect(m.opportunities, isEmpty);
  });

  group('ChatController', () {
    ProviderContainer make(FakeChatRepo repo) {
      final c = ProviderContainer(overrides: [chatRepositoryProvider.overrideWithValue(repo)]);
      addTearDown(c.dispose);
      return c;
    }

    test('shows the message immediately, then swaps in the server turn and keeps the conversation id', () async {
      final repo = FakeChatRepo([okTurn(), okTurn()]);
      final c = make(repo);
      final ctl = c.read(chatControllerProvider.notifier);

      final future = ctl.send('hello');
      expect(c.read(chatControllerProvider).messages.single.state, SendState.sending); // optimistic
      await future;

      var s = c.read(chatControllerProvider);
      expect(s.messages.map((m) => m.role), [ChatRole.user, ChatRole.assistant]);
      expect(s.messages.first.id, 'u1'); // placeholder replaced by the server's copy
      expect(s.conversationId, 'conv-1');

      await ctl.send('and another');
      expect(repo.sent.last.conversationId, 'conv-1'); // same thread
      s = c.read(chatControllerProvider);
      expect(s.sending, isFalse);
    });

    test('a failed turn keeps the message, marks it failed, and retry delivers it once', () async {
      final repo = FakeChatRepo([const Err(ErrorCodes.network, 'x'), okTurn()]);
      final c = make(repo);
      final ctl = c.read(chatControllerProvider.notifier);

      await ctl.send('hello');
      var s = c.read(chatControllerProvider);
      expect(s.messages.single.state, SendState.failed);
      expect(s.messages.single.text, 'hello'); // not lost
      expect(s.error!.code, ErrorCodes.network);

      await ctl.retry(s.messages.single.id);
      s = c.read(chatControllerProvider);
      expect(s.messages.length, 2); // user + reply, no duplicate
      expect(s.error, isNull);
      expect(repo.sent.map((e) => e.message), ['hello', 'hello']);
    });

    test('ignores blank input and a send while one is in flight', () async {
      final repo = FakeChatRepo([okTurn()]);
      final c = make(repo);
      final ctl = c.read(chatControllerProvider.notifier);

      await ctl.send('   ');
      expect(repo.sent, isEmpty);

      final first = ctl.send('one');
      await ctl.send('two'); // dropped: first still in flight
      await first;
      expect(repo.sent.map((e) => e.message), ['one']);
    });

    test('newChat starts a fresh thread', () async {
      final repo = FakeChatRepo([okTurn(), okTurn(conv: 'conv-2')]);
      final c = make(repo);
      final ctl = c.read(chatControllerProvider.notifier);
      await ctl.send('a');
      ctl.newChat();
      await ctl.send('b');
      expect(repo.sent.last.conversationId, isNull);
      expect(c.read(chatControllerProvider).conversationId, 'conv-2');
    });
  });

  group('ChatScreen', () {
    Widget host(FakeChatRepo repo, Locale locale) => ProviderScope(
          overrides: [chatRepositoryProvider.overrideWithValue(repo)],
          child: MaterialApp(
            locale: locale,
            supportedLocales: AppLocalizations.supportedLocales,
            localizationsDelegates: const [
              AppLocalizations.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            home: const ChatScreen(),
          ),
        );

    testWidgets('empty state offers suggestions; tapping one sends it and shows the reply and card', (tester) async {
      final repo = FakeChatRepo([okTurn()]);
      await tester.pumpWidget(host(repo, const Locale('en')));

      expect(find.text('How can we help?'), findsOneWidget);
      await tester.tap(find.text('My husband passed away. What help can I get?'));
      await tester.pumpAndSettle();

      expect(repo.sent.single.message, 'My husband passed away. What help can I get?');
      expect(find.text('Here is what we found.'), findsOneWidget);
      expect(find.text('Widow Allowance'), findsOneWidget);
      expect(find.text('You may qualify'), findsOneWidget);
      expect(find.textContaining('Simulated AI'), findsOneWidget);
    });

    testWidgets('a failed send shows the localised error and a tap-to-retry', (tester) async {
      final repo = FakeChatRepo([const Err(ErrorCodes.aiUnavailable, 'x'), okTurn()]);
      await tester.pumpWidget(host(repo, const Locale('bn')));

      await tester.enterText(find.byType(TextField), 'hi');
      await tester.tap(find.byIcon(Icons.send));
      await tester.pumpAndSettle();

      expect(find.text('hi'), findsOneWidget); // still visible
      expect(find.text('পাঠানো যায়নি। আবার চেষ্টা করতে ট্যাপ করুন।'), findsOneWidget);

      await tester.tap(find.text('পাঠানো যায়নি। আবার চেষ্টা করতে ট্যাপ করুন।'));
      await tester.pumpAndSettle();
      expect(find.text('Here is what we found.'), findsOneWidget);
    });
  });
}
