@Tags(['live'])
library;

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:shebar_janala_app/core/network/api_client.dart';
import 'package:shebar_janala_app/core/network/api_result.dart';
import 'package:shebar_janala_app/core/storage/token_store.dart';
import 'package:shebar_janala_app/features/auth/data/auth_repository.dart';
import 'package:shebar_janala_app/features/chat/data/chat_repository.dart';
import 'package:shebar_janala_app/features/opportunities/data/opportunity_repository.dart';

/// Runs against a real backend with the demo seed loaded (`npm run setup`).
///
///   flutter test --tags live --run-skipped --dart-define=API_BASE_URL=http://localhost:3000
///
/// Skipped by default because it needs a running server.
void main() {
  setUpAll(() => HttpOverrides.global = null); // flutter_test blocks real sockets.

  test('login, bearer call, refresh, restore and logout against the real backend', () async {
    final store = MemoryTokenStore();
    final api = ApiClient(tokens: store);
    final repo = AuthRepository(api: api, tokens: store);

    final bad = await repo.login(phone: '01712345678', pin: '9999');
    expect((bad as Err).code, anyOf(ErrorCodes.pinInvalid, ErrorCodes.rateLimited));

    final login = await repo.login(phone: '01712345678', pin: '1234');
    final user = (login as Ok).data;
    expect(user.role, 'citizen');
    expect(store.accessToken, isNotNull);

    final session = await repo.restore();
    expect((session as Ok).data?.id, user.id);

    // Rotate, then prove the NEW pair works and the old access token is not needed.
    expect(await api.refreshSession(), isTrue);
    final again = await repo.restore();
    expect((again as Ok).data?.id, user.id);

    // Real list + detail payloads must parse into the Dart models.
    final opps = OpportunityRepository(api);
    final page = (await opps.list(limit: 5) as Ok).data;
    expect(page.items, isNotEmpty);
    expect(page.items.first.eligibility, isNotNull); // personalised when signed in
    final detail = (await opps.detail(page.items.first.slug) as Ok).data;
    expect(detail.summary.slug, page.items.first.slug);
    expect(detail.rules, isNotEmpty);
    final searched = (await opps.list(query: 'widow', category: 'social_welfare') as Ok).data;
    expect(searched.items.every((i) => i.category == 'social_welfare'), isTrue);
    final missing = await opps.detail('no-such-programme');
    expect((missing as Err).code, ErrorCodes.notFound);

    // A real Bangla chat turn (UTF-8 end to end), then the transcript round-trips.
    final chat = ChatRepository(api);
    final turn = (await chat.send(
      message: 'আমার স্বামী মারা গেছেন, আমার তিনটি সন্তান আছে। আমি কী সহায়তা পেতে পারি?',
      locale: 'bn',
    ) as Ok)
        .data;
    expect(turn.assistant.text, isNotEmpty);
    expect(turn.assistant.opportunities, isNotEmpty);
    final transcript = (await chat.transcript(turn.conversationId) as Ok).data;
    expect(transcript.length, greaterThanOrEqualTo(2));
    expect((await chat.conversations() as Ok).data.any((c) => c.id == turn.conversationId), isTrue);

    await repo.logout();
    expect(await store.readRefreshToken(), isNull);
  });
}
