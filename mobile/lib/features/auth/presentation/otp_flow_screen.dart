import 'dart:async';

import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/i18n/error_text.dart';
import '../../../core/network/api_result.dart';
import '../../../core/providers.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../application/auth_controller.dart';
import '../data/auth_repository.dart';
import '../domain/auth_user.dart';
import '../domain/phone.dart';

/// The three sign-in routes that start with an SMS code. They share one screen
/// because they are the same two steps: prove you own the number, then finish.
enum OtpFlow {
  /// New account: code, name, PIN.
  register(OtpPurpose.register),

  /// Forgotten PIN: code, new PIN, then signed in.
  resetPin(OtpPurpose.resetPin),

  /// Recovery when the PIN is forgotten or the account is temporarily locked:
  /// the code alone signs you in (BDS 10.2.5 asks for a non-punitive route).
  otpLogin(OtpPurpose.login);

  const OtpFlow(this.purpose);
  final OtpPurpose purpose;
}

class OtpFlowScreen extends ConsumerStatefulWidget {
  const OtpFlowScreen({super.key, required this.flow});
  final OtpFlow flow;

  @override
  ConsumerState<OtpFlowScreen> createState() => _OtpFlowScreenState();
}

class _OtpFlowScreenState extends ConsumerState<OtpFlowScreen> {
  final _phoneForm = GlobalKey<FormState>();
  final _detailsForm = GlobalKey<FormState>();
  final _phone = TextEditingController();
  final _code = TextEditingController();
  final _name = TextEditingController();
  final _pin = TextEditingController();
  final _pin2 = TextEditingController();

  OtpIssue? _issue; // non-null once a code has been sent: that is "step 2"
  String? _language;
  bool _busy = false;
  String? _error;
  String? _requestId;
  int _secondsLeft = 0;
  Timer? _ticker;

  bool get _needsName => widget.flow == OtpFlow.register;
  bool get _needsPin => widget.flow != OtpFlow.otpLogin;

  @override
  void dispose() {
    _ticker?.cancel();
    for (final c in [_phone, _code, _name, _pin, _pin2]) {
      c.dispose();
    }
    super.dispose();
  }

  void _startCountdown(Duration d) {
    _ticker?.cancel();
    setState(() => _secondsLeft = d.inSeconds);
    _ticker = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return t.cancel();
      setState(() => _secondsLeft = (_secondsLeft - 1).clamp(0, 1 << 30));
      if (_secondsLeft == 0) t.cancel();
    });
  }

  void _fail(AppLocalizations l, Err<dynamic> e) {
    setState(() {
      _busy = false;
      _error = errorText(l, e);
      _requestId = e.requestId;
    });
  }

  Future<void> _sendCode(AppLocalizations l, {bool resend = false}) async {
    if (!resend && !_phoneForm.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final result = await ref.read(authRepositoryProvider).requestOtp(_phone.text, widget.flow.purpose);
    if (!mounted) return;
    switch (result) {
      case Ok<OtpIssue>(:final data):
        setState(() {
          _busy = false;
          _issue = data;
          _code.clear();
        });
        _startCountdown(data.resendAfter);
      case final Err<OtpIssue> e:
        _fail(l, e);
    }
  }

  Future<void> _finish(AppLocalizations l) async {
    if (!_detailsForm.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final auth = ref.read(authControllerProvider.notifier);
    final lang = _language ?? Localizations.localeOf(context).languageCode;
    final ApiResult<AuthUser> result = switch (widget.flow) {
      OtpFlow.register =>
        await auth.register(phone: _phone.text, code: _code.text, name: _name.text, pin: _pin.text, language: lang),
      OtpFlow.resetPin => await auth.resetPin(phone: _phone.text, code: _code.text, pin: _pin.text),
      OtpFlow.otpLogin => await auth.loginWithCode(phone: _phone.text, code: _code.text),
    };
    if (!mounted) return;
    // On success the router leaves this screen by itself; only failures stay.
    if (result is Err<AuthUser>) _fail(l, result);
  }

  String _title(AppLocalizations l) => switch (widget.flow) {
        OtpFlow.register => l.registerTitle,
        OtpFlow.resetPin => l.resetPinTitle,
        OtpFlow.otpLogin => l.otpLoginTitle,
      };

  String _finishLabel(AppLocalizations l) => switch (widget.flow) {
        OtpFlow.register => l.finishRegister,
        OtpFlow.resetPin => l.finishResetPin,
        OtpFlow.otpLogin => l.finishOtpLogin,
      };

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(_title(l))),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                if (_issue == null) _phoneStep(l) else _detailsStep(l),
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Semantics(liveRegion: true, child: Text(_error!, style: TextStyle(color: theme.colorScheme.error))),
                  if (_requestId != null) Text(l.errReference(_requestId!), style: theme.textTheme.bodySmall),
                ],
              ]),
            ),
          ),
        ),
      ),
    );
  }

  Widget _phoneStep(AppLocalizations l) {
    return Form(
      key: _phoneForm,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        TextFormField(
          controller: _phone,
          keyboardType: TextInputType.phone,
          autofillHints: const [AutofillHints.telephoneNumber],
          textInputAction: TextInputAction.done,
          onFieldSubmitted: (_) => _sendCode(l),
          decoration: InputDecoration(labelText: l.phoneLabel, hintText: l.phoneHint),
          validator: (v) => (v == null || !isValidBdPhone(v)) ? l.errPhone : null,
        ),
        const SizedBox(height: 20),
        FilledButton(onPressed: _busy ? null : () => _sendCode(l), child: _label(l.sendCode)),
      ]),
    );
  }

  Widget _detailsStep(AppLocalizations l) {
    final locale = Localizations.localeOf(context).languageCode;
    final issue = _issue!;
    final devCode = kDebugMode ? issue.devCode : null; // never surfaced in release builds

    return Form(
      key: _detailsForm,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(l.codeSentTo(_phone.text.trim())),
        if (devCode != null)
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextButton(
              onPressed: () => _code.text = devCode,
              child: Text(l.devCodeLabel(devCode)),
            ),
          ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _code,
          keyboardType: TextInputType.number,
          autofillHints: const [AutofillHints.oneTimeCode],
          inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
          decoration: InputDecoration(labelText: l.codeLabel),
          validator: (v) => (v == null || !isValidOtp(v)) ? l.errCode : null,
        ),
        if (_needsName) ...[
          const SizedBox(height: 16),
          TextFormField(
            controller: _name,
            textCapitalization: TextCapitalization.words,
            autofillHints: const [AutofillHints.name],
            decoration: InputDecoration(labelText: l.nameLabel, helperText: l.nameHelp),
            validator: (v) => (v == null || v.trim().length < 2) ? l.errName : null,
          ),
        ],
        if (_needsPin) ...[
          const SizedBox(height: 16),
          _pinField(
            _pin,
            l.newPinLabel,
            (v) => (v == null || !isValidPin(v)) ? l.errPin : (isGuessablePin(v) ? l.errPinWeak : null),
          ),
          const SizedBox(height: 16),
          _pinField(_pin2, l.confirmPinLabel, (v) => v != _pin.text ? l.pinMismatch : null),
        ],
        if (_needsName) ...[
          const SizedBox(height: 16),
          Text(l.chooseLanguage, style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 6),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'bn', label: Text('বাংলা')),
              ButtonSegment(value: 'en', label: Text('English')),
            ],
            selected: {_language ?? locale},
            onSelectionChanged: (s) => setState(() => _language = s.first),
          ),
        ],
        const SizedBox(height: 24),
        FilledButton(onPressed: _busy ? null : () => _finish(l), child: _label(_finishLabel(l))),
        const SizedBox(height: 8),
        TextButton(
          onPressed: (_busy || _secondsLeft > 0) ? null : () => _sendCode(l, resend: true),
          child: Text(_secondsLeft > 0 ? l.resendIn(_secondsLeft) : l.resendCode),
        ),
        TextButton(
          onPressed: _busy
              ? null
              : () => setState(() {
                    _issue = null;
                    _error = null;
                    _ticker?.cancel();
                  }),
          child: Text(l.changeNumber),
        ),
      ]),
    );
  }

  Widget _pinField(TextEditingController c, String label, String? Function(String?) validator) {
    return TextFormField(
      controller: c,
      obscureText: true,
      keyboardType: TextInputType.number,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
      // A PIN must not reach suggestions, autofill or the clipboard history.
      enableSuggestions: false,
      autocorrect: false,
      decoration: InputDecoration(labelText: label),
      validator: validator,
    );
  }

  Widget _label(String text) => _busy
      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
      : Text(text);
}
