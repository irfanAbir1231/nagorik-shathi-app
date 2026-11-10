import '../../opportunities/domain/opportunity.dart';

enum TaskStatus {
  pending('pending'),
  inProgress('in_progress'),
  done('done'),
  skipped('skipped');

  const TaskStatus(this.wire);
  final String wire;

  static TaskStatus parse(Object? raw) =>
      TaskStatus.values.firstWhere((s) => s.wire == raw, orElse: () => TaskStatus.pending);
}

enum TaskPriority {
  high,
  medium,
  low;

  static TaskPriority parse(Object? raw) =>
      TaskPriority.values.firstWhere((p) => p.name == raw, orElse: () => TaskPriority.medium);
}

class PlanTask {
  const PlanTask({
    required this.id,
    required this.title,
    required this.status,
    required this.priority,
    required this.sortOrder,
    this.description,
    this.dueDate,
    this.estimatedMinutes,
  });

  final String id;
  final Bilingual title;
  final Bilingual? description;
  final DateTime? dueDate;
  final TaskPriority priority;
  final int? estimatedMinutes;
  final TaskStatus status;
  final int sortOrder;

  bool get isDone => status == TaskStatus.done;

  PlanTask copyWith({TaskStatus? status}) => PlanTask(
        id: id,
        title: title,
        description: description,
        dueDate: dueDate,
        priority: priority,
        estimatedMinutes: estimatedMinutes,
        status: status ?? this.status,
        sortOrder: sortOrder,
      );

  factory PlanTask.fromJson(Map<String, dynamic> j) => PlanTask(
        id: j['id'] as String,
        title: Bilingual.fromPair(j['title'], j['titleBn']) ?? const Bilingual('', ''),
        description: Bilingual.fromPair(j['description'], j['descriptionBn']),
        dueDate: DateTime.tryParse('${j['dueDate']}'),
        priority: TaskPriority.parse(j['priority']),
        estimatedMinutes: (j['estimatedMinutes'] as num?)?.toInt(),
        status: TaskStatus.parse(j['status']),
        sortOrder: (j['sortOrder'] as num?)?.toInt() ?? 0,
      );
}

class ActionPlan {
  const ActionPlan({
    required this.id,
    required this.title,
    required this.tasks,
    this.opportunitySlug,
    this.createdAt,
  });

  final String id;
  final Bilingual title;
  final List<PlanTask> tasks;
  final String? opportunitySlug;
  final DateTime? createdAt;

  int get doneCount => tasks.where((t) => t.isDone).length;
  double get progress => tasks.isEmpty ? 0 : doneCount / tasks.length;

  ActionPlan withTask(String taskId, TaskStatus status) => ActionPlan(
        id: id,
        title: title,
        opportunitySlug: opportunitySlug,
        createdAt: createdAt,
        tasks: [for (final t in tasks) t.id == taskId ? t.copyWith(status: status) : t],
      );

  /// `plan` + `tasks` (+ optionally `opportunity`), as returned by both
  /// `GET /action-plans` (one entry per plan) and `POST /action-plans`.
  factory ActionPlan.fromJson(Map<String, dynamic> plan, List<dynamic> tasks, [Map<String, dynamic>? opportunity]) {
    final parsed = [
      for (final t in tasks)
        if (t is Map<String, dynamic>) PlanTask.fromJson(t),
    ]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    return ActionPlan(
      id: plan['id'] as String,
      title: Bilingual.fromPair(plan['title'], plan['titleBn']) ?? const Bilingual('', ''),
      tasks: parsed,
      opportunitySlug: opportunity?['slug'] as String?,
      createdAt: DateTime.tryParse('${plan['createdAt']}'),
    );
  }
}
