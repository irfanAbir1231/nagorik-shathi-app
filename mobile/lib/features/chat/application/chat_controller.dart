import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_result.dart';
import '../../../core/providers.dart';
import '../data/chat_repository.dart';
import '../domain/chat.dart';

class ChatState {
  const ChatState({this.conversationId, this.messages = const [], this.sending = false, this.error});

  final String? conversationId;
  final List<ChatMessage> messages;
  final bool sending;

  /// Error from the last failed turn or load, cleared on the next attempt.
  final Err<dynamic>? error;

  ChatState copyWith({
    String? conversationId,
    List<ChatMessage>? messages,
    bool? sending,
    Err<dynamic>? error,
    bool clearError = false,
    bool clearConversation = false,
  }) =>
      ChatState(
        conversationId: clearConversation ? null : (conversationId ?? this.conversationId),
        messages: messages ?? this.messages,
        sending: sending ?? this.sending,
        error: clearError ? null : (error ?? this.error),
      );
}

class ChatController extends Notifier<ChatState> {
  int _localId = 0;

  @override
  ChatState build() => const ChatState();

  ChatRepository get _repo => ref.read(chatRepositoryProvider);

  void newChat() => state = const ChatState();

  Future<void> open(String conversationId) async {
    state = ChatState(conversationId: conversationId, sending: true);
    final result = await _repo.transcript(conversationId);
    switch (result) {
      case Ok<List<ChatMessage>>(:final data):
        state = ChatState(conversationId: conversationId, messages: data);
      case final Err<List<ChatMessage>> e:
        state = ChatState(error: e);
    }
  }

  /// Sends [text]. The message appears at once (optimistic) and is marked
  /// failed, with a retry, if the turn does not complete; it is never silently
  /// dropped. The server says as much: "your message was not lost".
  Future<void> send(String text, {String? locale}) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || state.sending) return;

    final pending = ChatMessage(
      id: 'local-${_localId++}',
      role: ChatRole.user,
      text: trimmed,
      createdAt: DateTime.now(),
      state: SendState.sending,
    );
    state = state.copyWith(messages: [...state.messages, pending], sending: true, clearError: true);
    await _deliver(pending, locale);
  }

  /// Retries a message that failed to send.
  Future<void> retry(String messageId, {String? locale}) async {
    if (state.sending) return;
    final index = state.messages.indexWhere((m) => m.id == messageId);
    if (index < 0) return;
    final pending = state.messages[index].copyWith(state: SendState.sending);
    final messages = [...state.messages]..[index] = pending;
    state = state.copyWith(messages: messages, sending: true, clearError: true);
    await _deliver(pending, locale);
  }

  Future<void> _deliver(ChatMessage pending, String? locale) async {
    final result = await _repo.send(
      message: pending.text,
      conversationId: state.conversationId,
      locale: locale,
    );

    final index = state.messages.indexWhere((m) => m.id == pending.id);
    final messages = [...state.messages];
    switch (result) {
      case Ok<ChatTurn>(:final data):
        // Swap the local placeholder for the server's copy, then append the reply.
        if (index >= 0) messages[index] = data.user;
        messages.add(data.assistant);
        state = state.copyWith(conversationId: data.conversationId, messages: messages, sending: false);
      case final Err<ChatTurn> e:
        if (index >= 0) messages[index] = pending.copyWith(state: SendState.failed);
        state = state.copyWith(messages: messages, sending: false, error: e);
    }
  }
}

final chatControllerProvider = NotifierProvider<ChatController, ChatState>(ChatController.new);

final conversationsProvider = FutureProvider.autoDispose<List<ConversationSummary>>((ref) async {
  return (await ref.read(chatRepositoryProvider).conversations()).unwrap();
});
