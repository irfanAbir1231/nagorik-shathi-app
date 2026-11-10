import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/error_text.dart';
import '../../../core/network/api_result.dart';
import '../domain/auth_user.dart';
import '../domain/demo_accounts.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../application/auth_controller.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  // Debug builds only: prefill the seeded demo citizen (Rahima Begum). `kDebugMode`
  // is a compile-time constant, so release builds contain neither value.
  final _phone = TextEditingController(text: kDebugMode ? '01712345678' : null);
  final _pin = TextEditingController(text: kDebugMode ? '1234' : null);
  // Debug builds only: which seeded demo role is currently filled in.
  DemoAccount? _demo = kDebugMode ? demoAccounts.first : null;
  bool _busy = false;
  String? _error;
  String? _requestId;
  String? _errorCode;

  @override
  void dispose() {
    _phone.dispose();
    _pin.dispose();
    super.dispose();
  }

  Future<void> _submit(AppLocalizations l) async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final result = await ref.read(authControllerProvider.notifier).login(phone: _phone.text, pin: _pin.text);
    if (!mounted) return;
    // On success the router redirects; only failures stay on this screen.
    if (result is Err<AuthUser>) {
      setState(() {
        _busy = false;
        _error = errorText(l, result);
        _requestId = result.requestId;
        _errorCode = result.code;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(l.appName,
                        textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineMedium),
                    const SizedBox(height: 8),
                    Text(l.signInTitle, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
                    if (kDebugMode) ...[
                      const SizedBox(height: 20),
                      _RolePicker(
                        selected: _demo,
                        onPicked: (a) => setState(() {
                          _demo = a;
                          _phone.text = a.phone;
                          _pin.text = a.pin;
                          _error = null;
                          _errorCode = null;
                        }),
                      ),
                    ],
                    const SizedBox(height: 24),
                    TextFormField(
                      controller: _phone,
                      keyboardType: TextInputType.phone,
                      textInputAction: TextInputAction.next,
                      autofillHints: const [AutofillHints.telephoneNumber],
                      decoration: InputDecoration(labelText: l.phoneLabel, hintText: l.phoneHint),
                      validator: (v) => (v == null || v.trim().isEmpty) ? l.errRequired : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _pin,
                      obscureText: true,
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
                      // A PIN must not be offered to autofill, suggestions or the clipboard history.
                      enableSuggestions: false,
                      autocorrect: false,
                      onFieldSubmitted: (_) => _submit(l),
                      decoration: InputDecoration(labelText: l.pinLabel),
                      validator: (v) => (v == null || !RegExp(r'^\d{4,6}$').hasMatch(v)) ? l.errPin : null,
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 16),
                      Semantics(
                        liveRegion: true,
                        child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                      ),
                      if (_requestId != null)
                        Text(l.errReference(_requestId!), style: Theme.of(context).textTheme.bodySmall),
                    ],
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: _busy ? null : () => _submit(l),
                      child: _busy
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                          : Text(l.signInButton),
                    ),
                    const SizedBox(height: 8),
                    // A locked account cannot use its PIN, so offer the code route right where it hurts.
                    if (_errorCode == 'ACCOUNT_LOCKED')
                      TextButton(onPressed: () => context.push('/otp-login'), child: Text(l.signInWithCode)),
                    TextButton(onPressed: () => context.push('/forgot-pin'), child: Text(l.forgotPin)),
                    TextButton(onPressed: () => context.push('/register'), child: Text(l.createAccount)),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Debug-only role chooser: fills in a seeded account's phone number and PIN.
class _RolePicker extends StatelessWidget {
  const _RolePicker({required this.selected, required this.onPicked});
  final DemoAccount? selected;
  final ValueChanged<DemoAccount> onPicked;

  Future<void> _open(BuildContext context) async {
    final l = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context);
    final picked = await showModalBottomSheet<DemoAccount>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (ctx) => SafeArea(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(ctx).height * 0.8),
          child: ListView(shrinkWrap: true, children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Text(l.demoChooseRole, style: Theme.of(ctx).textTheme.titleMedium),
            ),
            for (final a in demoAccounts)
              ListTile(
                leading: Icon(a == selected ? Icons.radio_button_checked : Icons.radio_button_unchecked),
                title: Text(a.role.of(locale)),
                subtitle: Text('${a.name}\n${a.phone} · ${a.detail.of(locale)}'),
                isThreeLine: true,
                onTap: () => Navigator.of(ctx).pop(a),
              ),
          ]),
        ),
      ),
    );
    if (picked != null) onPicked(picked);
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context);
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: theme.colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(l.demoHeader, style: theme.textTheme.labelMedium),
        const SizedBox(height: 4),
        Text(l.demoPickHint, style: theme.textTheme.bodySmall),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: () => _open(context),
          icon: const Icon(Icons.badge_outlined),
          label: Align(
            alignment: AlignmentDirectional.centerStart,
            child: Text(selected == null ? l.demoChooseRole : '${selected!.role.of(locale)} · ${selected!.name}'),
          ),
        ),
      ]),
    );
  }
}
