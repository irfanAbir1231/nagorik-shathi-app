import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/error_text.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../opportunities/presentation/labels.dart';
import '../../opportunities/presentation/opportunities_screen.dart' show ErrorRetry;
import '../../opportunities/presentation/opportunity_card.dart' show OutcomeChip;
import '../../voice/application/voice_controller.dart';
import '../../voice/application/voice_providers.dart';
import '../../voice/domain/speech_input.dart';
import '../application/chat_controller.dart';
import '../domain/chat.dart';

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  String get _locale => Localizations.localeOf(context).languageCode;

  void _send([String? preset]) {
    final text = preset ?? _input.text;
    if (text.trim().isEmpty) return;
    ref.read(voiceControllerProvider.notifier).cancel();
    ref.read(chatControllerProvider.notifier).send(text, locale: _locale);
    _input.clear();
  }

  /// Puts a transcript into the box for the person to read and fix before
  /// sending. Speech recognition is wrong often enough, especially in Bangla,
  /// that sending it straight to the assistant would be a mistake.
  void _insertTranscript(String text) {
    final existing = _input.text.trimRight();
    final joined = existing.isEmpty ? text : '$existing $text';
    _input.value = TextEditingValue(text: joined, selection: TextSelection.collapsed(offset: joined.length));
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _showHistory() async {
    final id = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (_) => const _HistorySheet(),
    );
    if (id != null) ref.read(chatControllerProvider.notifier).open(id);
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final chat = ref.watch(chatControllerProvider);
    ref.listen(chatControllerProvider.select((s) => s.messages.length), (_, _) => _scrollToEnd());
    final voice = ref.watch(voiceControllerProvider);
    ref.listen(voiceControllerProvider.select((s) => s.resultSeq), (_, _) {
      final text = ref.read(voiceControllerProvider).result;
      if (text != null && text.isNotEmpty) _insertTranscript(text);
    });

    return Scaffold(
      appBar: AppBar(
        title: Text(l.chatTitle),
        actions: [
          IconButton(tooltip: l.chatHistory, icon: const Icon(Icons.history), onPressed: _showHistory),
          IconButton(
            tooltip: l.chatNew,
            icon: const Icon(Icons.add_comment_outlined),
            onPressed: chat.sending ? null : () => ref.read(chatControllerProvider.notifier).newChat(),
          ),
        ],
      ),
      body: Column(children: [
        Expanded(child: _body(l, chat)),
        if (chat.error != null && chat.messages.any((m) => m.state == SendState.failed))
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
            child: Semantics(
              liveRegion: true,
              child: Text(
                errorText(l, chat.error!),
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          ),
        _VoiceStatus(state: voice),
        _Composer(
          controller: _input,
          sending: chat.sending,
          voice: voice,
          onSend: _send,
          onMic: () => ref.read(voiceControllerProvider.notifier).toggle(_locale),
        ),
      ]),
    );
  }

  Widget _body(AppLocalizations l, ChatState chat) {
    if (chat.messages.isEmpty && chat.sending) {
      return const Center(child: CircularProgressIndicator()); // opening a past chat
    }
    if (chat.messages.isEmpty && chat.error != null) {
      return ErrorRetry(
        error: chat.error!,
        onRetry: () {
          final id = chat.conversationId;
          if (id != null) ref.read(chatControllerProvider.notifier).open(id);
        },
      );
    }
    if (chat.messages.isEmpty) return _EmptyState(onPick: _send);

    final thinking = chat.sending && chat.messages.last.role == ChatRole.user;
    return ListView.builder(
      controller: _scroll,
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
      itemCount: chat.messages.length + (thinking ? 1 : 0),
      itemBuilder: (context, i) {
        if (i == chat.messages.length) return _Bubble.thinking(l.chatThinking);
        final m = chat.messages[i];
        return _MessageView(
          message: m,
          onRetry: () => ref.read(chatControllerProvider.notifier).retry(m.id, locale: _locale),
        );
      },
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onPick});
  final void Function(String text) onPick;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final suggestions = [l.chatSuggestion1, l.chatSuggestion2, l.chatSuggestion3];
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.forum_outlined, size: 48, color: theme.colorScheme.primary),
          const SizedBox(height: 12),
          Text(l.chatEmptyTitle, style: theme.textTheme.titleLarge),
          const SizedBox(height: 8),
          Text(l.chatEmptyBody, textAlign: TextAlign.center),
          const SizedBox(height: 20),
          for (final s in suggestions)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: ActionChip(label: Text(s), onPressed: () => onPick(s)),
            ),
        ]),
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.sending,
    required this.voice,
    required this.onSend,
    required this.onMic,
  });
  final TextEditingController controller;
  final bool sending;
  final VoiceState voice;
  final VoidCallback onSend;
  final VoidCallback onMic;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 6, 12, 8),
        child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Expanded(
            child: TextField(
              controller: controller,
              minLines: 1,
              maxLines: 4,
              maxLength: 2000, // the server's limit
              buildCounter: (_, {required currentLength, required isFocused, maxLength}) => null,
              textInputAction: TextInputAction.newline,
              decoration: InputDecoration(
                hintText: l.chatHint,
                border: const OutlineInputBorder(),
                isDense: true,
              ),
            ),
          ),
          const SizedBox(width: 8),
          _MicButton(state: voice, onPressed: onMic),
          const SizedBox(width: 4),
          IconButton.filled(
            tooltip: l.chatSend,
            onPressed: sending ? null : onSend,
            icon: const Icon(Icons.send),
          ),
        ]),
      ),
    );
  }
}

class _MicButton extends StatelessWidget {
  const _MicButton({required this.state, required this.onPressed});
  final VoiceState state;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final scheme = Theme.of(context).colorScheme;
    return switch (state.status) {
      VoiceStatus.transcribing => const SizedBox(
          width: 48,
          height: 48,
          child: Padding(padding: EdgeInsets.all(14), child: CircularProgressIndicator(strokeWidth: 2)),
        ),
      VoiceStatus.listening => IconButton.filled(
          tooltip: l.voiceStop,
          style: IconButton.styleFrom(backgroundColor: scheme.error, foregroundColor: scheme.onError),
          onPressed: onPressed,
          icon: const Icon(Icons.stop),
        ),
      VoiceStatus.idle => IconButton.outlined(tooltip: l.voiceStart, onPressed: onPressed, icon: const Icon(Icons.mic)),
    };
  }
}

/// One line above the box: what the microphone is doing, or why it could not.
class _VoiceStatus extends StatelessWidget {
  const _VoiceStatus({required this.state});
  final VoiceState state;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final failure = state.failure;

    final String? text;
    var isError = false;
    if (state.status == VoiceStatus.listening) {
      text = state.partial.isEmpty ? l.voiceListening : state.partial;
    } else if (state.status == VoiceStatus.transcribing) {
      text = l.voiceTranscribing;
    } else if (failure != null) {
      isError = true;
      text = switch (failure.kind) {
        VoiceFailureKind.permissionDenied => l.voiceErrPermission,
        VoiceFailureKind.unavailable => l.voiceErrUnavailable,
        VoiceFailureKind.localeUnavailable => l.voiceErrLocale,
        VoiceFailureKind.noSpeech => l.voiceErrNoSpeech,
        VoiceFailureKind.server => l.voiceErrServer,
      };
    } else {
      text = null;
    }
    if (text == null) return const SizedBox.shrink();

    return Semantics(
      liveRegion: true,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
        child: Align(
          alignment: AlignmentDirectional.centerStart,
          child: Text(text, style: TextStyle(color: isError ? theme.colorScheme.error : theme.colorScheme.primary)),
        ),
      ),
    );
  }
}

class _ReadAloudButton extends ConsumerWidget {
  const _ReadAloudButton({required this.message});
  final ChatMessage message;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final language = Localizations.localeOf(context).languageCode;
    // No button where the phone has no proper voice: Bangla read by an English
    // voice is worse than silence because it sounds like it works.
    if (ref.watch(canSpeakProvider(language)).value != true) return const SizedBox.shrink();

    final l = AppLocalizations.of(context);
    final speaking = ref.watch(speakingProvider) == message.id;
    return IconButton(
      visualDensity: VisualDensity.compact,
      tooltip: speaking ? l.stopReading : l.readAloud,
      icon: Icon(speaking ? Icons.stop_circle_outlined : Icons.volume_up_outlined),
      onPressed: () => ref
          .read(speakingProvider.notifier)
          .toggle(messageId: message.id, text: message.text, language: language),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.mine, required this.child});
  final bool mine;
  final Widget child;

  factory _Bubble.thinking(String label) => _Bubble(
        mine: false,
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2)),
          const SizedBox(width: 8),
          Text(label),
        ]),
      );

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Align(
      alignment: mine ? AlignmentDirectional.centerEnd : AlignmentDirectional.centerStart,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.all(12),
        constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.86),
        decoration: BoxDecoration(
          color: mine ? scheme.primaryContainer : scheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(14),
        ),
        child: child,
      ),
    );
  }
}

class _MessageView extends StatelessWidget {
  const _MessageView({required this.message, required this.onRetry});
  final ChatMessage message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final mine = message.role == ChatRole.user;

    if (mine) {
      final failed = message.state == SendState.failed;
      return Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
        _Bubble(mine: true, child: SelectableText(message.text)),
        if (failed)
          InkWell(
            onTap: onRetry,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.error_outline, size: 16, color: theme.colorScheme.error),
                const SizedBox(width: 4),
                Text(l.chatNotSent, style: TextStyle(color: theme.colorScheme.error)),
              ]),
            ),
          ),
      ]);
    }

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _Bubble(mine: false, child: SelectableText(message.text)),
      _ReadAloudButton(message: message),
      for (final o in message.opportunities) _ProgrammeCard(item: o),
      if (message.isSimulated)
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 2, 4, 0),
          child: Text(l.chatSimulatedNote, style: theme.textTheme.bodySmall),
        ),
    ]);
  }
}

class _ProgrammeCard extends StatelessWidget {
  const _ProgrammeCard({required this.item});
  final ChatOpportunity item;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context);
    final theme = Theme.of(context);
    final money = benefitText(l, locale, item.benefitAmount, item.benefitPeriod);

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/opportunity/${item.slug}'),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(item.title.of(locale), style: theme.textTheme.titleSmall),
            if (item.organisation != null) Text(item.organisation!.of(locale), style: theme.textTheme.bodySmall),
            if (money != null) ...[
              const SizedBox(height: 4),
              Text(money, style: TextStyle(color: theme.colorScheme.primary, fontWeight: FontWeight.w600)),
            ],
            const SizedBox(height: 6),
            OutcomeChip(outcome: item.outcome),
            if (item.isUnverified) ...[
              const SizedBox(height: 4),
              Text(verificationLabel(l, 'unverified_sample'), style: theme.textTheme.bodySmall),
            ],
            if (item.nextStep != null) ...[
              const SizedBox(height: 6),
              Text('${l.chatNextStep}: ${item.nextStep!.of(locale)}', style: theme.textTheme.bodySmall),
            ],
          ]),
        ),
      ),
    );
  }
}

class _HistorySheet extends ConsumerWidget {
  const _HistorySheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final async = ref.watch(conversationsProvider);
    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.6),
        child: async.when(
          loading: () => const SizedBox(height: 160, child: Center(child: CircularProgressIndicator())),
          error: (e, _) => SizedBox(
            height: 220,
            child: ErrorRetry(error: e, onRetry: () => ref.invalidate(conversationsProvider)),
          ),
          data: (items) => items.isEmpty
              ? SizedBox(height: 120, child: Center(child: Text(l.chatNoHistory)))
              : ListView(shrinkWrap: true, children: [
                  for (final c in items)
                    ListTile(
                      leading: const Icon(Icons.chat_bubble_outline),
                      title: Text(c.title, maxLines: 2, overflow: TextOverflow.ellipsis),
                      onTap: () => Navigator.of(context).pop(c.id),
                    ),
                ]),
        ),
      ),
    );
  }
}
