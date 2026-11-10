/// The signed-in citizen, as returned by `POST /auth/login` and `GET /auth/session`.
class AuthUser {
  const AuthUser({
    required this.id,
    required this.name,
    required this.phone,
    required this.role,
    required this.language,
    this.district,
  });

  final String id;
  final String name;
  final String phone;
  final String role;

  /// 'bn' or 'en'.
  final String language;
  final String? district;

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id'] as String,
        name: json['name'] as String,
        phone: json['phone'] as String,
        role: json['role'] as String,
        language: (json['language'] as String?) == 'en' ? 'en' : 'bn',
        district: json['district'] as String?,
      );
}
