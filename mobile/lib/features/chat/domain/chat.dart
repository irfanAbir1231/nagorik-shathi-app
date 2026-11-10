import '../../opportunities/domain/opportunity.dart';

enum ChatRole { user, assistant }

/// A programme the assistant recommended, as embedded in `payload.plan.opportunities`.
class ChatOpportunity {
  const ChatOpportunity({
    required this.slug,
    required this.title,
    required this.outcome,
    required this.isUnverified,
    this.summary,
    this.organisation,
    this.benefitAmount,
    this.benefitPeriod,
    this.nextStep,
    this.firstReason,
  });

  final String slug;
  final Bilingual title;
  final Bilingual? summary;
  final Bilingual? organisation;
  final EligibilityOutcome outcome;
  final int? benefitAmount;
  final String? benefitPeriod;
  final bool isUnverified;
  final Bilingual? nextStep;
  final Bilingual? firstReason;

  factory ChatOpportunity.fromJson(Map<String, dynamic> j) {
    final met = j['metReasons'];
    return ChatOpportunity(
      slug: j['slug'] as String,
      title: Bilingual.fromObject(j['title']) ?? const Bilingual('', ''),
      summary: Bilingual.fromObject(j['summary']),
      organisation: Bilingual.fromObject(j['organisation']),
      outcome: EligibilityOutcome.parse(j['outcome']),
      benefitAmount: (j['benefitAmount'] as num?)?.toInt(),
      benefitPeriod: j['benefitPeriod'] as String?,
      isUnverified: j['isUnverified'] == true,
      nextStep: Bilingual.fromObject(j['nextStep']),
      firstReason: met is List && met.isNotEmpty ? Bilingual.fromObject(met.first) : null,
    );
  }
}

enum SendState { sent, sending, failed }

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.role,
    required this.text,
    required this.createdAt,
    this.kind = 'text',
    this.opportunities = const [],
    this.engine,
    this.state = SendState.sent,
  });

  final String id;
  final ChatRole role;
  final String text;
  final DateTime createdAt;

  /// 'text' | 'recommendation' | 'clarification' (the server's message kind).
  final String kind;
  final List<ChatOpportunity> opportunities;

  /// 'simulated' when no live model produced the prose; the decisions are the same.
  final String? engine;
  final SendState state;

  bool get isSimulated => engine == 'simulated';

  ChatMessage copyWith({SendState? state}) => ChatMessage(
        id: id,
        role: role,
        text: text,
        createdAt: createdAt,
        kind: kind,
        opportunities: opportunities,
        engine: engine,
        state: state ?? this.state,
      );

  /// From a server message row (`userMessage`, `assistantMessage`, or a history entry).
  factory ChatMessage.fromJson(Map<String, dynamic> j) {
    final payload = j['payload'];
    final plan = payload is Map<String, dynamic> ? payload['plan'] : null;
    final opps = plan is Map<String, dynamic> ? plan['opportunities'] : null;
    return ChatMessage(
      id: j['id'] as String,
      role: j['role'] == 'user' ? ChatRole.user : ChatRole.assistant,
      text: (j['content'] as String?) ?? '',
      kind: (j['kind'] as String?) ?? 'text',
      createdAt: DateTime.tryParse('${j['createdAt']}') ?? DateTime.now(),
      engine: j['aiEngine'] as String?,
      opportunities: [
        if (opps is List)
          for (final o in opps)
            if (o is Map<String, dynamic>) ChatOpportunity.fromJson(o),
      ],
    );
  }
}

class ChatTurn {
  const ChatTurn({required this.conversationId, required this.user, required this.assistant});
  final String conversationId;
  final ChatMessage user;
  final ChatMessage assistant;

  factory ChatTurn.fromJson(Map<String, dynamic> d) => ChatTurn(
        conversationId: d['conversationId'] as String,
        user: ChatMessage.fromJson(d['userMessage'] as Map<String, dynamic>),
        assistant: ChatMessage.fromJson(d['assistantMessage'] as Map<String, dynamic>),
      );
}

class ConversationSummary {
  const ConversationSummary({required this.id, required this.title, required this.lastMessageAt});
  final String id;
  final String title;
  final DateTime lastMessageAt;

  factory ConversationSummary.fromJson(Map<String, dynamic> j) => ConversationSummary(
        id: j['id'] as String,
        title: (j['title'] as String?) ?? '',
        lastMessageAt: DateTime.tryParse('${j['lastMessageAt']}') ?? DateTime.now(),
      );
}
