'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Phone, User, KeyRound, MapPin, PhoneCall } from 'lucide-react';
import { useRouter, Link } from '@/i18n/navigation';
import { api, ApiError, NetworkError } from '@/lib/api/client';
import { TextField } from '@/components/primitives/TextField';
import { OtpInput } from '@/components/primitives/OtpInput';
import { Button } from '@/components/primitives/Button';
import { Select } from '@/components/primitives/Select';
import { Banner, InfoPanel } from '@/components/primitives/Banner';
import { ProgressSteps } from '@/components/primitives/States';
import { CheckboxRow } from '@/components/primitives/Choice';
import { DictateDigits } from '@/components/voice/DictateDigits';
import { safeNextPath } from '@/lib/routing/next-path';
import { DISTRICTS } from '@/lib/domain/geography';
import { detectOperator, formatPhone, maskPhone, normalisePhone } from '@/lib/format/numerals';
import type { AppLocale } from '@/i18n/routing';

/**
 * The phone + OTP + PIN flow, covering sign-in, registration, and PIN reset.
 *
 * One component because the three flows share the same first two steps and the
 * same failure handling; splitting them would triple the OTP logic, which is the
 * part BDS §10.2.5 identifies as the most failure-prone screen in the category.
 *
 * Behaviours that are requirements, not choices:
 *  • Server field errors map onto the input that caused them.
 *  • A wrong code keeps the digits on screen so the citizen can see and fix
 *    their typo rather than starting over.
 *  • The resend countdown runs to zero and then enables a real button.
 *  • The account-locked case offers the OTP route instead of a dead end.
 */

export type AuthMode = 'login' | 'register' | 'reset';

const RAHIMA_DEMO_PHONE = '01712345678';
const RAHIMA_DEMO_PIN = '1234';

type Step = 'phone' | 'code' | 'details';

interface OtpState {
  readonly expiresAt: string;
  readonly resendAfterMs: number;
  readonly devCode?: string;
}

export function AuthFlow({ mode, nextPath }: { readonly mode: AuthMode; readonly nextPath?: string }) {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const te = useTranslations('errors');
  const tv = useTranslations('voice');
  const locale = useLocale() as AppLocale;
  const router = useRouter();

  const [step, setStep] = useState<Step>(mode === 'login' ? 'phone' : 'phone');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [district, setDistrict] = useState<string | undefined>(undefined);
  const [consent, setConsent] = useState(false);

  const [otp, setOtp] = useState<OtpState | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [lockedOut, setLockedOut] = useState(false);
  /** True once the citizen chooses the code route instead of the PIN. */
  const [useCodeInstead, setUseCodeInstead] = useState(mode !== 'login');

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Where to land after signing in.
   *
   * Sanitised HERE rather than trusted from the query string, for two reasons.
   *
   * It must be locale-RELATIVE: `router` is next-intl's locale-aware one and adds
   * the prefix itself, so a `next` of `/en/nearby` produced `/en/en/nearby` — a
   * route that does not exist, which then 404'd into a framework crash about
   * missing `<html>` tags. Middleware always sent a relative path; the renew route
   * sent a prefixed one, and only one of them could be right.
   *
   * And it is attacker-controlled: this value is navigated to the instant a
   * citizen finishes entering their PIN, which makes it the most valuable open
   * redirect in the app. `safeNextPath` refuses anything that is not a local path.
   */
  const destination = safeNextPath(nextPath, '/dashboard') as '/dashboard';

  const startCountdown = useCallback((ms: number) => {
    setSecondsLeft(Math.ceil(ms / 1000));
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const handleError = (error: unknown) => {
    setFieldErrors({});
    if (error instanceof NetworkError) {
      setFormError(te('networkBody'));
      return;
    }
    if (error instanceof ApiError) {
      if (error.fields) setFieldErrors(error.fields);
      setFormError(error.fields ? null : error.message);
      if (error.code === 'ACCOUNT_LOCKED') setLockedOut(true);
      return;
    }
    setFormError(te('genericBody'));
  };

  const purpose = mode === 'register' ? 'register' : mode === 'reset' ? 'reset_pin' : 'login';

  /* ------------------------------------------------------ step: phone */

  const requestCode = async () => {
    setBusy(true);
    setFormError(null);
    setFieldErrors({});
    try {
      const result = await api.post<OtpState>('/auth/otp', { phone, purpose });
      setOtp(result);
      startCountdown(result.resendAfterMs);
      setStep('code');
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };

  const signInWithPin = async () => {
    setBusy(true);
    setFormError(null);
    setFieldErrors({});
    try {
      await api.post('/auth/login', { phone, pin }, { retryOnUnauthenticated: false });
      router.replace(destination);
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };

  const signInAsRahima = async () => {
    setPhone(RAHIMA_DEMO_PHONE);
    setPin(RAHIMA_DEMO_PIN);
    setUseCodeInstead(false);
    setBusy(true);
    setFormError(null);
    setFieldErrors({});
    try {
      await api.post(
        '/auth/login',
        { phone: RAHIMA_DEMO_PHONE, pin: RAHIMA_DEMO_PIN },
        { retryOnUnauthenticated: false },
      );
      router.replace(destination);
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------------------------------- step: code */

  const submitCode = async () => {
    setBusy(true);
    setFormError(null);
    try {
      if (mode === 'login') {
        await api.post('/auth/login', { phone, code }, { retryOnUnauthenticated: false });
        router.replace(destination);
        return;
      }
      // Registration and reset both need the code verified alongside the new
      // details, so the code is held and the citizen moves to the details step.
      setStep('details');
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };

  /* ---------------------------------------------------- step: details */

  const completeRegistration = async () => {
    if (pin !== pinConfirm) {
      setFieldErrors({ pinConfirm: locale === 'bn' ? 'দুটি পিন মিলছে না। আবার লিখুন।' : 'The two PINs do not match. Try again.' });
      return;
    }
    setBusy(true);
    setFormError(null);
    setFieldErrors({});
    try {
      if (mode === 'register') {
        await api.post(
          '/auth/register',
          { phone, code, name, pin, language: locale, district: district ?? null },
          { retryOnUnauthenticated: false },
        );
      } else {
        await api.post('/auth/pin', { phone, code, pin }, { retryOnUnauthenticated: false });
      }
      router.replace(destination);
    } catch (error) {
      handleError(error);
      // A rejected code sends the citizen back one step rather than trapping
      // them on a form they cannot submit.
      if (error instanceof ApiError && error.code.startsWith('OTP')) {
        setStep('code');
        setCode('');
      }
    } finally {
      setBusy(false);
    }
  };

  const operator = detectOperator(phone, locale);
  const phoneValid = normalisePhone(phone) !== null;

  const totalSteps = mode === 'login' ? 1 : 3;
  const currentStep = step === 'phone' ? 1 : step === 'code' ? 2 : 3;

  return (
    <div className="mx-auto w-full max-w-form">
      <h1 className="type-heading-lg text-text-primary">
        {mode === 'register' ? t('signUpTitle') : mode === 'reset' ? t('forgotPinTitle') : t('signInTitle')}
      </h1>

      {totalSteps > 1 ? (
        <ProgressSteps
          className="mt-5"
          current={currentStep}
          total={totalSteps}
          label={locale === 'bn' ? `ধাপ ${currentStep} / ${totalSteps}` : `Step ${currentStep} of ${totalSteps}`}
        />
      ) : null}

      {(mode === 'login' || mode === 'register') && step === 'phone' ? (
        <Banner
          tone="info"
          statusWord={locale === 'bn' ? 'ডেমো হিসাব' : 'Demo account'}
          className="mt-5"
          actions={
            <Button
              type="button"
              variant="secondary"
              fullWidth={false}
              loading={busy}
              loadingLabel={locale === 'bn' ? 'রহিমার হিসাবে ঢুকছে…' : 'Signing in as Rahima…'}
              onClick={() => void signInAsRahima()}
            >
              {locale === 'bn' ? 'রহিমা খাতুন হিসাবে ঢুকুন' : 'Sign in as Rahima Khatun'}
            </Button>
          }
        >
          <span>
            {locale === 'bn' ? 'মোবাইল' : 'Phone'}:{' '}
            <strong dir="ltr" className="tabular">{RAHIMA_DEMO_PHONE}</strong>
            {' · '}
            {locale === 'bn' ? 'পিন' : 'PIN'}:{' '}
            <strong dir="ltr" className="tabular">{RAHIMA_DEMO_PIN}</strong>
          </span>
        </Banner>
      ) : null}

      {formError ? (
        <Banner tone="error" statusWord={locale === 'bn' ? 'সমস্যা' : 'Problem'} className="mt-5" live>
          {formError}
        </Banner>
      ) : null}

      {lockedOut ? (
        <Banner
          tone="warning"
          statusWord={locale === 'bn' ? 'অপেক্ষা করুন' : 'Please wait'}
          className="mt-5"
          actions={
            <Button
              variant="secondary"
              fullWidth={false}
              onClick={() => {
                setLockedOut(false);
                setUseCodeInstead(true);
                setPin('');
                setFormError(null);
              }}
            >
              {t('signInWithCode')}
            </Button>
          }
        >
          {locale === 'bn'
            ? 'কয়েকবার ভুল পিন দেওয়া হয়েছে। কোড দিয়ে ঢুকতে পারেন, অথবা কিছুক্ষণ পর আবার চেষ্টা করুন।'
            : 'The PIN was wrong several times. You can sign in with a code instead, or try again shortly.'}
        </Banner>
      ) : null}

      {/* ================================================= step: phone */}
      {step === 'phone' ? (
        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (mode === 'login' && !useCodeInstead) void signInWithPin();
            else void requestCode();
          }}
        >
          <TextField
            label={t('phoneLabel')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            autoFocus
            normaliseDigits
            emphasis
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('phonePlaceholder')}
            helper={operator ?? t('phoneHelp')}
            {...(fieldErrors.phone ? { error: fieldErrors.phone } : {})}
            leadingIcon={<Phone size={20} className="icon" />}
            clearable
            onClear={() => setPhone('')}
            clearLabel={tc('close')}
            maxLength={20}
          />

          {/* Eleven digits is where a lot of people give up. No `phone` is passed
              here — there is no code challenge yet to authorise a clip against, so
              this works wherever the browser itself can listen and says why it
              cannot otherwise. The code field below is the path that matters, and
              it does have that authorisation. */}
          <DictateDigits
            digits={11}
            label={tv('speakPhone')}
            onDigits={(value) => {
              setPhone(value);
              setFieldErrors({});
            }}
          />

          {mode === 'login' && !useCodeInstead ? (
            <TextField
              label={t('pinLabel')}
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              normaliseDigits
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              {...(fieldErrors.pin ? { error: fieldErrors.pin } : {})}
              leadingIcon={<KeyRound size={20} className="icon" />}
              maxLength={6}
            />
          ) : null}

          <Button
            type="submit"
            size="xl"
            loading={busy}
            loadingLabel={mode === 'login' && !useCodeInstead ? t('signingIn') : t('sendingCode')}
            disabled={!phoneValid || (mode === 'login' && !useCodeInstead && pin.length < 4)}
            disabledReason={
              !phoneValid
                ? t('phoneHelp')
                : locale === 'bn'
                  ? 'পিন ৪ থেকে ৬ সংখ্যার হতে হবে।'
                  : 'The PIN must be 4 to 6 digits.'
            }
          >
            {mode === 'login' && !useCodeInstead ? tc('signIn') : t('sendCode')}
          </Button>

          {mode === 'login' ? (
            <div className="flex flex-col gap-2">
              <Button
                variant="tertiary"
                size="md"
                onClick={() => {
                  setUseCodeInstead((v) => !v);
                  setFormError(null);
                  setFieldErrors({});
                }}
              >
                {useCodeInstead ? tc('signIn') + ' — ' + t('pinLabel') : t('signInWithCode')}
              </Button>
              <Link
                href="/forgot-pin"
                className="type-body-md inline-flex min-h-12 items-center justify-center text-text-link underline focus-visible:outline-3 focus-visible:outline-stroke-focus focus-visible:outline-offset-2"
              >
                {t('forgotPin')}
              </Link>
            </div>
          ) : null}

          <InfoPanel title={t('whyPhone')}>{t('whyPhoneBody')}</InfoPanel>

          <p className="type-body-md text-center text-text-secondary">
            {mode === 'register' ? t('haveAccount') : t('noAccount')}{' '}
            <Link
              href={mode === 'register' ? '/login' : '/register'}
              className="text-text-link underline"
            >
              {mode === 'register' ? tc('signIn') : tc('createAccount')}
            </Link>
          </p>
        </form>
      ) : null}

      {/* ================================================== step: code */}
      {step === 'code' ? (
        <div className="mt-6 flex flex-col gap-5">
          <p className="type-body-lg text-text-secondary">
            {t('otpSentTo')}{' '}
            <span dir="ltr" className="tabular text-text-primary">
              {maskPhone(phone)}
            </span>
            {'. '}
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setCode('');
                setFormError(null);
              }}
              className="min-h-12 text-text-link underline focus-visible:outline-3 focus-visible:outline-stroke-focus focus-visible:outline-offset-2"
            >
              {t('changeNumber')}
            </button>
          </p>

          {/* Clearly labelled as a development affordance, never styled as
              ordinary copy — see OTP_DEV_ECHO in .env.example. */}
          {otp?.devCode ? (
            <Banner tone="info" statusWord={locale === 'bn' ? 'ডেভেলপমেন্ট' : 'Development'}>
              {t('devCodeNotice')}{' '}
              <strong className="type-mono-md tabular">{otp.devCode}</strong>
            </Banner>
          ) : null}

          <OtpInput
            label={t('otpTitle')}
            value={code}
            onChange={(next) => {
              setCode(next);
              setFormError(null);
            }}
            onComplete={() => void submitCode()}
            {...(fieldErrors.code ? { error: fieldErrors.code } : {})}
            boxLabel={(n, total) => t('otpBoxLabel', { n, total })}
          />

          {/* Six digits into six separate boxes — BDS §10.2.5 calls this the most
              failure-prone screen in the category, and WCAG 2.2 requires an
              accessible authentication route.

              The spoken code fills the boxes and stops. It deliberately does NOT
              submit, unlike typing the sixth digit: a challenge allows only a few
              attempts, and spending one on a mishearing the citizen never got to
              look at is how voice locks someone out of their own account.

              `phone` goes with the clip because there is no session yet — the
              server authorises it against the live code challenge for this number
              (see the note on /api/v1/voice/transcribe). */}
          <DictateDigits
            digits={6}
            label={tv('speakCode')}
            phone={phone}
            onDigits={(value) => {
              setCode(value);
              setFormError(null);
              setFieldErrors({});
            }}
          />

          <Button
            size="xl"
            loading={busy}
            loadingLabel={t('verifying')}
            disabled={code.length !== 6}
            disabledReason={locale === 'bn' ? '৬ সংখ্যার কোড লিখুন।' : 'Enter the 6-digit code.'}
            onClick={() => void submitCode()}
          >
            {t('verifyAndContinue')}
          </Button>

          <div className="flex flex-col gap-2">
            {secondsLeft > 0 ? (
              <p className="type-body-md text-center tabular text-text-secondary" aria-live="polite">
                {t('resendIn', { seconds: secondsLeft })}
              </p>
            ) : (
              <Button variant="secondary" size="md" onClick={() => void requestCode()} loading={busy}>
                {t('resend')}
              </Button>
            )}

            {/* Voice OTP is the accessible-authentication path BDS §10.2.5
                requires. It is offered honestly: disabled with a reason, because
                no telephony provider is configured. */}
            <Button
              variant="tertiary"
              size="md"
              disabled
              disabledReason={t('voiceOtpUnavailable')}
              leadingIcon={<PhoneCall size={20} className="icon" />}
            >
              {t('voiceOtp')}
            </Button>
            <p className="type-caption text-center text-text-tertiary">{t('voiceOtpUnavailable')}</p>
          </div>
        </div>
      ) : null}

      {/* =============================================== step: details */}
      {step === 'details' ? (
        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void completeRegistration();
          }}
        >
          {mode === 'register' ? (
            <>
              <TextField
                label={t('nameLabel')}
                autoComplete="name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                helper={t('nameHelp')}
                {...(fieldErrors.name ? { error: fieldErrors.name } : {})}
                leadingIcon={<User size={20} className="icon" />}
                maxLength={120}
              />

              <Select
                label={t('districtLabel')}
                optionalLabel={tc('optional')}
                placeholder={tc('search')}
                helper={t('districtHelp')}
                value={district}
                onChange={setDistrict}
                searchPlaceholder={tc('search')}
                popularHeading={locale === 'bn' ? 'বড় শহর' : 'Major cities'}
                allHeading={locale === 'bn' ? 'সব জেলা' : 'All districts'}
                noResultsText={locale === 'bn' ? 'এই নামে জেলা পাওয়া যায়নি' : 'No district with that name'}
                helpCtaText={locale === 'bn' ? '৩৩৩ নম্বরে কল করুন' : 'Call 333 for help'}
                options={DISTRICTS.map((d) => ({
                  value: d.code,
                  label: locale === 'bn' ? d.bn : d.en,
                  // Both scripts plus the code, so "dhaka", "ঢাকা", and
                  // "coxs_bazar" all match.
                  keywords: [d.en, d.bn, d.code, d.code.replace(/_/g, ' ')],
                  popular: ['dhaka', 'chattogram', 'khulna', 'rajshahi', 'sylhet', 'rangpur', 'barishal', 'mymensingh'].includes(d.code),
                }))}
              />
            </>
          ) : null}

          <TextField
            label={t('pinLabel')}
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            normaliseDigits
            emphasis
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            helper={t('pinHelp')}
            {...(fieldErrors.pin ? { error: fieldErrors.pin } : {})}
            leadingIcon={<KeyRound size={20} className="icon" />}
            maxLength={6}
          />

          <TextField
            label={t('pinConfirmLabel')}
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            normaliseDigits
            value={pinConfirm}
            onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
            {...(fieldErrors.pinConfirm ? { error: fieldErrors.pinConfirm } : {})}
            leadingIcon={<KeyRound size={20} className="icon" />}
            maxLength={6}
          />

          {mode === 'register' ? (
            <CheckboxRow checked={consent} onChange={setConsent} label={t('consentLabel')} />
          ) : null}

          <Button
            type="submit"
            size="xl"
            loading={busy}
            loadingLabel={mode === 'register' ? t('creatingAccount') : t('verifying')}
            disabled={
              pin.length < 4 ||
              pinConfirm.length < 4 ||
              (mode === 'register' && (name.trim().length < 2 || !consent))
            }
            disabledReason={
              mode === 'register' && !consent
                ? t('consentLabel')
                : locale === 'bn'
                  ? 'নাম ও ৪ সংখ্যার পিন দিন।'
                  : 'Enter your name and a 4-digit PIN.'
            }
          >
            {mode === 'register' ? tc('createAccount') : tc('submit')}
          </Button>
        </form>
      ) : null}

      <p className="type-caption mt-6 text-center text-text-tertiary" dir="ltr">
        {formatPhone(phone) !== phone && phoneValid ? formatPhone(phone) : ''}
      </p>
    </div>
  );
}
