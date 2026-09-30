'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send, Mic, MicOff, Copy, ThumbsUp, ThumbsDown, Flag, FileSearch,
  ChevronDown, Sparkles, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { api, ApiError, NetworkError } from '@/lib/api/client';
import { Button } from '@/components/primitives/Button';
import { IconButton } from '@/components/primitives/IconButton';
import { Card } from '@/components/primitives/Card';
import { Banner } from '@/components/primitives/Banner';
import { Spinner } from '@/components/primitives/Spinner';
import { ConfidenceMeter, Badge } from '@/components/primitives/Chip';
import { OpportunityCard, type OpportunityCardData } from '@/components/opportunity/OpportunityCard';
import { AiEngineNotice } from './AiEngineNotice';
import { EvidencePanel, DecisionTrace, type ConditionView, type PlanEvidenceView } from './EvidencePanel';
import { useToast } from '@/components/providers/ToastProvider';
import { usePreferences } from '@/components/providers/PreferencesProvider';
import { useVoice, useVoiceReadable, useVoiceActions } from '@/components/providers/VoiceProvider';
import { SpeakButton } from '@/components/voice/SpeakButton';
import { formatTimeAgo } from '@/lib/format/dates';
import type { AiEngine, VerificationStatus } from '@/lib/domain/enums';

/**
 * Chat — PRD §61, the primary interaction surface.
 *
 * Notable behaviours:
 *  • Voice input via the Web Speech API with `bn-BD`. Offered only when the
 *    browser actually supports it, and its absence is stated rather than the
 *    button silently doing nothing (BDS §75: every error is actionable).
 *  • The composer is a sticky footer above the keyboard, never covered by the
 *    bottom nav, and the send button is disabled with a REASON when empty.
 *  • The waiting state escalates after 8 seconds to the reassurance line BDS
 *    §10.1.5 requires, because a silent long wait reads as a hung app.
 *  • Recommendations render as real cards inside the transcript, so the citizen
 *    can act without leaving the conversation.
 *  • Every assistant turn exposes its sources and confidence — PRD §Feature 19.
 */

interface PlanOpportunity {
  readonly id: string;
  readonly slug: string;
  readonly title: { bn: string; en: string };
  readonly summary: { bn: string; en: string };
  readonly organisation: { bn: string; en: string };
  readonly category: string;
  readonly outcome: OpportunityCardData['eligibility']['outcome'];
  readonly benefitAmount: number | null;
  readonly benefitPeriod: string | null;
  readonly deadline: string | null;
  readonly confidence: number;
  readonly isUnverified: boolean;
  /** Absent on messages stored before evidence provenance existed. */
  readonly verificationStatus?: VerificationStatus;
  readonly conditions?: ConditionView[];
  readonly decisionStatus?: string;
  readonly metReasons: { bn: string; en: string }[];
  readonly failedReasons: { bn: string; en: string }[];
  readonly unknownReasons: { bn: string; en: string }[];
}

interface Citation {
  readonly chunkId: string;
  readonly title: string;
  readonly excerpt: string;
  readonly sourceUrl: string | null;
}

export interface ChatMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant' | 'system';
  readonly kind: string;
  readonly content: string;
  readonly createdAt: string;
  readonly confidence?: number | null;
  readonly aiEngine?: AiEngine | null;
  readonly payload?: {
    readonly plan?: {
      readonly kind: string;
      readonly opportunities: PlanOpportunity[];
      readonly citations: Citation[];
      readonly ungrounded: boolean;
      readonly evidence?: PlanEvidenceView;
      readonly renderPath?: string;
    };
  } | null;
}

interface TurnResponse {
  readonly conversationId: string;
  readonly userMessage: ChatMessage;
  readonly assistantMessage: ChatMessage;
  readonly plan: {
    kind: string;
    opportunities: PlanOpportunity[];
    citations: Citation[];
    ungrounded: boolean;
    evidence?: PlanEvidenceView;
  };
  readonly renderPath?: string;
  readonly understanding: {
    readonly lifeEvents: { event: string; matchedKeyword: string; confidence: number }[];
    readonly extractedFields: string[];
  };
  readonly profileUpdated: string[];
  readonly engine: AiEngine;
  readonly degraded: boolean;
}

export function ChatClient({
  initialMessages,
  initialConversationId,
  aiMode,
  userName,
}: {
  readonly initialMessages: readonly ChatMessage[];
  readonly initialConversationId: string | null;
  readonly aiMode: AiEngine;
  readonly userName: string;
}) {
  const t = useTranslations('chat');
  const tc = useTranslations('common');
  const te = useTranslations('errors');
  const locale = useLocale() as 'bn' | 'en';
  const { voiceEnabled } = usePreferences();
  const toast = useToast();
  const queryClient = useQueryClient();

  const voice = useVoice();

  const [messages, setMessages] = useState<ChatMessage[]>([...initialMessages]);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [draft, setDraft] = useState('');
  const [waitingLong, setWaitingLong] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const longTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const listening = voice.state === 'listening';
  const voiceSupported = voice.canListen;

  /**
   * What "পড়ে শোনাও" reads on this screen: the most recent assistant reply.
   *
   * Registered rather than hard-wired, so the same spoken command reads the right
   * thing on every screen.
   */
  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');
  useVoiceReadable(() => lastAssistantMessage?.content ?? '');

  const scrollToEnd = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  useEffect(scrollToEnd, [messages, scrollToEnd]);

  const turn = useMutation({
    mutationFn: (message: string) =>
      api.post<TurnResponse>('/chat', { message, conversationId, locale }),
    onMutate: (message) => {
      setError(null);
      // Optimistic user bubble so the citizen sees their own words immediately
      // even on a slow connection.
      const optimistic: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        role: 'user',
        kind: 'text',
        content: message,
        createdAt: new Date().toISOString(),
      };
      setMessages((current) => [...current, optimistic]);
      longTimerRef.current = setTimeout(() => setWaitingLong(true), 8000);
      return { optimisticId: optimistic.id };
    },
    onSuccess: (data, _message, context) => {
      setConversationId(data.conversationId);
      setDegraded(data.degraded);
      setMessages((current) => [
        ...current.filter((m) => m.id !== context?.optimisticId),
        data.userMessage,
        { ...data.assistantMessage, payload: { plan: { ...data.plan, ...(data.renderPath ? { renderPath: data.renderPath } : {}) } } },
      ]);
      if (data.profileUpdated.length > 0) {
        toast.show({ tone: 'success', message: t('savedToProfile') });
      }
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (mutationError, _message, context) => {
      // The citizen's text is restored to the composer, never lost.
      setMessages((current) => current.filter((m) => m.id !== context?.optimisticId));
      setDraft(_message);
      if (mutationError instanceof NetworkError) setError(te('networkBody'));
      else if (mutationError instanceof ApiError) setError(mutationError.message);
      else setError(te('genericBody'));
    },
    onSettled: () => {
      setWaitingLong(false);
      if (longTimerRef.current) clearTimeout(longTimerRef.current);
    },
  });

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || turn.isPending) return;
    setDraft('');
    turn.mutate(trimmed);
  };

  /**
   * Clearing the thread. One function for the button and the spoken command, so
   * the two cannot drift into resetting different amounts of state.
   *
   * The draft is deliberately kept. A citizen who has half-typed a question and
   * then says "নতুন কথা" wants a clean thread, not their own sentence deleted —
   * and re-typing it is precisely the cost voice input existed to remove.
   */
  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  };

  /**
   * `confirm: 'always'` in the registry. Clearing the thread is not undoable from
   * this screen, and the conversation is the context every following answer is
   * built on — a mishearing here silently makes the assistant forget what the
   * citizen already told it about their income and their situation.
   */
  useVoiceActions({ 'action.newChat': startNewConversation });

  /* ------------------------------------------------------ voice input */

  /**
   * Dictation now goes through the shared voice layer rather than a second copy
   * of the Web Speech API that used to live here.
   *
   * That copy had no fallback, so it silently did nothing on the browsers most of
   * this audience actually uses — Firefox, and any Android WebView, meaning every
   * link opened inside Facebook or WhatsApp. The shared layer tries Web Speech
   * first and falls back to recording a clip for server transcription.
   *
   * The transcript lands in the composer instead of sending: a chat message
   * updates the profile, and a misheard income figure would produce a
   * confidently wrong eligibility answer. The citizen reads it, then sends.
   */
  const dictateIntoComposer = () => {
    if (voice.state === 'listening') {
      voice.stop();
      return;
    }
    voice.dictate((text) => {
      setDraft((current) => (current.trim() ? `${current.trim()} ${text}` : text));
      textareaRef.current?.focus();
    });
  };

  /* -------------------------------------------------------- feedback */

  const feedback = useMutation({
    mutationFn: (input: { messageId: string; kind: string }) =>
      api.post('/feedback', { messageId: input.messageId, kind: input.kind }),
    onSuccess: () => toast.show({ tone: 'success', message: t('feedbackThanks') }),
    onError: () => toast.show({ tone: 'error', message: te('genericBody') }),
  });

  const suggestions = [
    t('suggestion1'),
    t('suggestion2'),
    t('suggestion3'),
    t('suggestion4'),
    t('suggestion5'),
  ];

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col">
      <div className="flex items-center justify-between gap-3">
        <h1 className="type-heading-lg text-text-primary">{t('title')}</h1>
        <Button
          variant="secondary"
          size="md"
          fullWidth={false}
          leadingIcon={<Plus size={20} className="icon" />}
          onClick={startNewConversation}
        >
          {t('newConversation')}
        </Button>
      </div>

      <AiEngineNotice mode={aiMode} degraded={degraded} className="mt-4" />

      {/* ----------------------------------------------------- transcript */}
      <div className="mt-5 flex flex-1 flex-col gap-4" role="log" aria-live="polite" aria-label={t('title')}>
        {messages.length === 0 ? (
          <Card padding="hero" className="flex flex-col gap-4">
            <Sparkles size={32} className="icon text-ramp-green-600" aria-hidden="true" />
            <p className="type-body-lg text-text-primary measure">
              {locale === 'bn'
                ? `${userName}, আপনার পরিস্থিতি সম্পর্কে আমাকে বলুন — কী ঘটেছে, বা আপনার কী দরকার।`
                : `${userName}, tell me about your situation — what happened, or what you need.`}
            </p>
            <p className="type-body-md text-text-secondary">
              {locale === 'bn'
                ? 'আপনি লিখতে পারেন, অথবা মাইক চেপে বলতে পারেন।'
                : 'You can type, or press the microphone and speak.'}
            </p>
          </Card>
        ) : null}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            locale={locale}
            onFeedback={(kind) => feedback.mutate({ messageId: message.id, kind })}
          />
        ))}

        {turn.isPending ? (
          <div className="flex items-center gap-3 rounded-lg bg-surface p-4 shadow-elev-1" role="status">
            <Spinner size={24} className="text-ramp-green-600" />
            <span className="type-body-lg text-text-primary">
              {waitingLong ? t('thinkingLong') : t('thinking')}
            </span>
          </div>
        ) : null}

        {error ? (
          <Banner
            tone="error"
            statusWord={locale === 'bn' ? 'সমস্যা' : 'Problem'}
            live
            actions={
              <Button variant="secondary" size="md" fullWidth={false} onClick={() => send(draft)}>
                {tc('retry')}
              </Button>
            }
          >
            {error}
          </Banner>
        ) : null}

        <div ref={endRef} />
      </div>

      {/* --------------------------------------------------- suggestions */}
      {messages.length === 0 ? (
        <div className="mt-5">
          <p className="type-label-md mb-2 text-text-secondary">{t('suggestedTitle')}</p>
          <ul className="flex flex-col gap-2">
            {suggestions.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onClick={() => send(suggestion)}
                  className="flex min-h-14 w-full items-center gap-3 rounded-md border-1.5 border-stroke bg-surface px-4 py-3 text-start type-body-lg text-text-primary hover:border-stroke-brand hover:bg-surface-brand-subtle focus-visible:outline-3 focus-visible:outline-stroke-focus focus-visible:outline-offset-2"
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ------------------------------------------------------ composer */}
      <div className="sticky bottom-0 -mx-4 mt-5 border-t border-stroke-subtle bg-surface px-4 py-3 pb-safe md:-mx-5 md:px-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="flex items-end gap-2"
        >
          <label htmlFor="chat-input" className="sr-only">
            {t('inputLabel')}
          </label>
          <textarea
            id="chat-input"
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter breaks the line — the convention every
              // messaging app on the device already uses.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            rows={1}
            placeholder={t('inputPlaceholder')}
            maxLength={2000}
            className={cn(
              'min-h-14 flex-1 resize-none rounded-md bg-surface px-4 py-3.5 type-body-lg text-text-primary',
              'border-[length:var(--bds-border-width-functional)] border-stroke placeholder:text-text-placeholder',
              'focus:border-2 focus:border-stroke-focus focus:outline-none',
              'focus-visible:outline-3 focus-visible:outline-stroke-focus focus-visible:outline-offset-2',
            )}
            style={{ maxHeight: '9rem' }}
          />

          {voiceEnabled && voiceSupported ? (
            <IconButton
              label={listening ? t('voiceStop') : t('voiceStart')}
              variant={listening ? 'filled' : 'plain'}
              size="lg"
              onClick={dictateIntoComposer}
              icon={
                listening ? (
                  <MicOff size={24} className="icon text-ramp-error-600" />
                ) : (
                  <Mic size={24} className="icon" />
                )
              }
            />
          ) : null}

          <Button
            type="submit"
            size="lg"
            fullWidth={false}
            className="w-14 px-0"
            loading={turn.isPending}
            loadingLabel={t('sending')}
            disabled={draft.trim().length === 0}
            disabledReason={t('inputPlaceholder')}
            leadingIcon={<Send size={24} className="icon" />}
          >
            <span className="sr-only">{t('send')}</span>
          </Button>
        </form>

        {listening ? (
          <p className="type-body-md mt-2 text-text-brand" aria-live="polite">
            {t('voiceListening')}
          </p>
        ) : null}
        {voiceEnabled && !voiceSupported ? (
          <p className="type-caption mt-2 text-text-tertiary">{t('voiceUnsupported')}</p>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- bubble */

function MessageBubble({
  message,
  locale,
  onFeedback,
}: {
  readonly message: ChatMessage;
  readonly locale: 'bn' | 'en';
  readonly onFeedback: (kind: string) => void;
}) {
  const t = useTranslations('chat');
  const tt = useTranslations('trust');
  const tc = useTranslations('common');
  const [showSources, setShowSources] = useState(false);
  const toast = useToast();

  const isUser = message.role === 'user';
  const plan = message.payload?.plan;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg rounded-ee-xs bg-surface-brand-subtle px-4 py-3">
          <p className="type-body-lg whitespace-pre-wrap text-text-primary">{message.content}</p>
          <p className="type-caption mt-1 text-text-secondary">
            {formatTimeAgo(new Date(message.createdAt), locale)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Card padding="default" className="flex flex-col gap-3">
        {/* Markdown-lite: the composer emits **bold** and newlines only. */}
        <div className="type-body-lg flex flex-col gap-2 text-text-primary measure">
          {message.content.split('\n\n').map((paragraph, index) => (
            <p key={index} className="whitespace-pre-wrap">
              {paragraph.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                part.startsWith('**') && part.endsWith('**') ? (
                  <strong key={i} className="type-strong">
                    {part.slice(2, -2)}
                  </strong>
                ) : (
                  part
                ),
              )}
            </p>
          ))}
        </div>

        {typeof message.confidence === 'number' && message.confidence > 0 ? (
          <ConfidenceMeter
            value={message.confidence}
            label={tt('confidence')}
            bandLabel={
              message.confidence >= 80 ? tt('high') : message.confidence >= 55 ? tt('medium') : tt('low')
            }
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {message.aiEngine === 'simulated' ? (
            <Badge tone="info">{t('engineSimulated')}</Badge>
          ) : message.aiEngine ? (
            <Badge tone="success">{t('engineLive')}</Badge>
          ) : null}

          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(message.content);
              toast.show({ tone: 'success', message: tc('copied') });
            }}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-md px-3 type-label-md text-text-secondary hover:bg-surface-sunken focus-visible:outline-3 focus-visible:outline-stroke-focus focus-visible:outline-offset-2"
          >
            <Copy size={18} className="icon" aria-hidden="true" />
            {t('copyResponse')}
          </button>

          {plan && plan.citations.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowSources((v) => !v)}
              aria-expanded={showSources}
              className="inline-flex min-h-12 items-center gap-1.5 rounded-md px-3 type-label-md text-text-link hover:bg-surface-info focus-visible:outline-3 focus-visible:outline-stroke-focus focus-visible:outline-offset-2"
            >
              <FileSearch size={18} className="icon" aria-hidden="true" />
              {t('sourcesTitle')} ({plan.citations.length})
              <ChevronDown
                size={18}
                className={cn('icon transition-transform duration-fast', showSources && 'rotate-180')}
                aria-hidden="true"
              />
            </button>
          ) : null}
        </div>

        {/* Sources — PRD §33 item 4: cite the organisation for every claim. */}
        {showSources && plan ? (
          <ul className="flex flex-col gap-2 rounded-md bg-surface-sunken p-3">
            {plan.citations.map((citation) => (
              <li key={citation.chunkId} className="flex flex-col gap-1">
                <span className="type-label-md text-text-primary">{citation.title}</span>
                <span className="type-body-md text-text-secondary clamp-3">{citation.excerpt}</span>
                {citation.sourceUrl ? (
                  <a
                    href={citation.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="type-body-md inline-flex min-h-12 items-center text-text-link underline"
                  >
                    {citation.sourceUrl}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {plan?.evidence ? <EvidencePanel evidence={plan.evidence} locale={locale} /> : null}

        {plan?.renderPath === 'model_verified' ? (
          <p className="type-caption text-text-secondary">{t('verifiedByChecker')}</p>
        ) : plan?.renderPath === 'template_verifier_rejected' ? (
          <p className="type-caption text-text-secondary">{t('templateAfterCheck')}</p>
        ) : null}

        {plan?.ungrounded ? (
          <Banner tone="warning" statusWord={locale === 'bn' ? 'সতর্কতা' : 'Note'}>
            {t('noSources')}
          </Banner>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-stroke-subtle pt-3">
          {/* First in the row, deliberately. For a citizen who cannot read the
              answer, this is not a secondary action — it is how they receive it. */}
          <SpeakButton text={message.content} />
          <button
            type="button"
            onClick={() => onFeedback('helpful')}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-md px-3 type-label-md text-text-secondary hover:bg-surface-success hover:text-text-success focus-visible:outline-3 focus-visible:outline-stroke-focus focus-visible:outline-offset-2"
          >
            <ThumbsUp size={18} className="icon" aria-hidden="true" />
            {t('helpful')}
          </button>
          <button
            type="button"
            onClick={() => onFeedback('not_helpful')}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-md px-3 type-label-md text-text-secondary hover:bg-surface-warning hover:text-text-warning focus-visible:outline-3 focus-visible:outline-stroke-focus focus-visible:outline-offset-2"
          >
            <ThumbsDown size={18} className="icon" aria-hidden="true" />
            {t('notHelpful')}
          </button>
          <button
            type="button"
            onClick={() => onFeedback('incorrect_information')}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-md px-3 type-label-md text-text-error hover:bg-surface-error focus-visible:outline-3 focus-visible:outline-stroke-focus focus-visible:outline-offset-2"
          >
            <Flag size={18} className="icon" aria-hidden="true" />
            {t('reportIncorrect')}
          </button>
        </div>
      </Card>

      {/* Recommendation cards inline, so the citizen can act here. */}
      {plan && plan.opportunities.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {plan.opportunities.map((o) => (
            <li key={o.id}>
              <OpportunityCard
                item={{
                  id: o.id,
                  slug: o.slug,
                  title: o.title.en,
                  titleBn: o.title.bn,
                  summary: o.summary.en,
                  summaryBn: o.summary.bn,
                  category: o.category,
                  benefitAmount: o.benefitAmount,
                  benefitPeriod: o.benefitPeriod,
                  deadline: o.deadline,
                  // Prefer the real status: `isUnverified` alone cannot tell
                  // `outdated` or `disputed` apart from verified.
                  verificationStatus: o.verificationStatus ?? (o.isUnverified ? 'unverified_sample' : 'verified'),
                  organization: { name: o.organisation.en, nameBn: o.organisation.bn },
                  eligibility: {
                    outcome: o.outcome,
                    topReason: o.metReasons[0] ?? null,
                    topBlocker: o.failedReasons[0] ?? null,
                    missingFields: o.unknownReasons.map(() => 'unknown'),
                  },
                  confidence: {
                    score: o.confidence,
                    band: o.confidence >= 80 ? 'high' : o.confidence >= 55 ? 'medium' : 'low',
                  },
                  saved: null,
                }}
                compact
              />
              {o.conditions && o.conditions.length > 0 ? (
                <DecisionTrace conditions={o.conditions} decisionStatus={o.decisionStatus} locale={locale} />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
