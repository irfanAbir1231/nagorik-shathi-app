import '../../opportunities/domain/opportunity.dart';

/// Where a saved programme is on the citizen's way to getting it.
/// `wire` is the backend's `SAVED_STATUSES` value.
enum SavedStatus {
  interested('interested'),
  preparing('preparing'),
  documentsReady('documents_ready'),
  applied('applied'),
  underReview('under_review'),
  approved('approved'),
  rejected('rejected'),
  completed('completed');

  const SavedStatus(this.wire);
  final String wire;

  static SavedStatus parse(Object? raw) =>
      SavedStatus.values.firstWhere((s) => s.wire == raw, orElse: () => SavedStatus.interested);
}

class SavedItem {
  const SavedItem({required this.id, required this.status, required this.opportunity, this.note, this.savedAt});

  final String id;
  final SavedStatus status;
  final String? note;
  final DateTime? savedAt;
  final OpportunitySummary opportunity;

  SavedItem copyWith({SavedStatus? status}) => SavedItem(
        id: id,
        status: status ?? this.status,
        opportunity: opportunity,
        note: note,
        savedAt: savedAt,
      );

  /// One entry of `GET /saved` → `{ saved, opportunity, organization }`.
  factory SavedItem.fromJson(Map<String, dynamic> j) {
    final saved = j['saved'] as Map<String, dynamic>;
    final opp = j['opportunity'] as Map<String, dynamic>;
    return SavedItem(
      id: saved['id'] as String,
      status: SavedStatus.parse(saved['status']),
      note: saved['note'] as String?,
      savedAt: DateTime.tryParse('${saved['savedAt']}'),
      opportunity: OpportunitySummary.fromJson({...opp, 'organization': j['organization']}),
    );
  }
}
