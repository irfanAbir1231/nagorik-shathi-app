import type { Message } from '@/lib/db/schema';
import type { EligibilityProfile } from '@/modules/eligibility/engine';
import { PROMPTS } from '@/prompts';
import { formatDate } from '@/lib/format/dates';
import { composeResponse } from './composer';
import { assertNumericGrounding } from './grounding';
import { verifyExplanation, type VerificationResult } from './verifier';
import { pickLocalised, type PlannedCondition, type ResponsePlan } from './response-plan';
import type { LlmProvider } from './providers/types';
import type { DecisionModel } from './decision/types';

/**
 * Rendering: turning a FIXED plan into citizen-facing text.
 *
 * Model prose is allowed through a sequence of gates, each of which falls back
 * to the deterministic composer (which renders the same plan from templates):
 *
 *   1. injection    the message looked like instructions to the system → template
 *   2. provider     the generative call failed                          → template (degraded)
 *   3. numbers      the prose states a number absent from the plan      → template
 *   4. verifier     Jev reads the prose as contradicting a verdict, or
 *                   naming a programme not in the plan (or cannot run)   → template
 *
 * Nothing in here can change the plan. The only output is text.
 */

/** How the citizen-facing text was produced, for the log and the UI. */
export type RenderPath =
  | 'template'
  | 'model_verified'
  | 'model_unverified'
  | 'template_injection_suspected'
  | 'template_numeric_gate'
  | 'template_verifier_rejected'
  | 'template_provider_failed';

export interface RenderResult {
  readonly text: string;
  readonly renderPath: RenderPath;
  readonly verification: VerificationResult | null;
  readonly providerFailed: boolean;
  readonly tokensIn: number;
  readonly tokensOut: number;
  readonly error: string | null;
}

function profileNumbers(profile: EligibilityProfile): string[] {
  return Object.values(profile).filter((v): v is number => typeof v === 'number').map(String);
}

export async function renderTurn(input: {
  readonly plan: ResponsePlan;
  readonly message: string;
  readonly history: readonly Pick<Message, 'role' | 'content'>[];
  readonly profile: EligibilityProfile;
  readonly provider: LlmProvider;
  readonly decisionModel: DecisionModel | null;
  readonly injectionFlagged: boolean;
  readonly signal?: AbortSignal;
}): Promise<RenderResult> {
  const { plan } = input;
  const template = (renderPath: RenderPath, extra: Partial<RenderResult> = {}): RenderResult => ({
    text: composeResponse(plan),
    renderPath,
    verification: null,
    providerFailed: false,
    tokensIn: 0,
    tokensOut: 0,
    error: null,
    ...extra,
  });

  if (!input.provider.isLive || plan.kind === 'greeting' || plan.kind === 'out_of_scope') return template('template');

  // The message tried to instruct the system. Eligibility is unaffected (no
  // text reaches the rule engine), but generative prose is the one place an
  // instruction could still land, so this turn is answered by the template.
  if (input.injectionFlagged) return template('template_injection_suspected');

  let rendered: { text: string; tokensIn: number; tokensOut: number };
  try {
    rendered = await renderWithModel(plan, input.message, input.history, input.profile, input.provider, input.signal);
  } catch (error) {
    // A provider failure degrades to the deterministic composer rather than
    // failing the citizen's request. The UI shows the degraded badge.
    return template('template_provider_failed', { providerFailed: true, error: error instanceof Error ? error.message : String(error) });
  }
  const usage = { tokensIn: rendered.tokensIn, tokensOut: rendered.tokensOut };

  try {
    // A number the citizen said, or that is in their profile, is not an
    // invention when the model repeats it back to them.
    assertNumericGrounding(rendered.text, plan, [input.message, ...profileNumbers(input.profile)]);
  } catch (error) {
    return template('template_numeric_gate', { ...usage, error: error instanceof Error ? error.message : String(error) });
  }

  if (!input.decisionModel) {
    return { text: rendered.text, renderPath: 'model_unverified', verification: null, providerFailed: false, ...usage, error: null };
  }

  const verification = await verifyExplanation(rendered.text, plan, input.decisionModel, input.signal);
  if (verification.verdict === 'reject') {
    return template('template_verifier_rejected', { ...usage, verification, error: verification.reasons.join(' ') });
  }
  return { text: rendered.text, renderPath: 'model_verified', verification, providerFailed: false, ...usage, error: null };
}

const PROVENANCE_TAG: Record<string, string> = {
  this_message: 'from what they just said',
  earlier_message: 'from earlier in this conversation',
  profile: 'from their profile',
  account: 'account default, not confirmed by them',
};

const VERIFICATION_TAG: Record<string, string> = {
  unverified_sample: 'UNVERIFIED SAMPLE DATA',
  pending_review: 'PENDING REVIEW — NOT YET VERIFIED',
  outdated: 'OUTDATED — MAY HAVE CHANGED',
  disputed: 'DISPUTED — DO NOT PRESENT AS FACT',
};

/**
 * Renders the plan with a live model. The model receives ONLY the plan's
 * contents as context, so it cannot introduce a programme, amount, or rule that
 * the deterministic layer did not put there — and what it writes is checked
 * against the plan before it is shown.
 */
export async function renderWithModel(
  plan: ResponsePlan,
  message: string,
  history: readonly Pick<Message, 'role' | 'content'>[],
  profile: EligibilityProfile,
  provider: LlmProvider,
  signal?: AbortSignal,
): Promise<{ text: string; tokensIn: number; tokensOut: number }> {
  const locale = plan.locale;
  // Stated explicitly: in live runs the model answered English messages in
  // Bangla despite the system prompt's same-language rule.
  const language = locale === 'bn' ? 'Bangla' : 'English';

  const profileSummary = [
    profile.age !== undefined ? `Age: ${profile.age}` : null,
    profile.gender ? `Gender: ${profile.gender}` : null,
    profile.district ? `District: ${profile.district}` : null,
    profile.occupation ? `Occupation: ${profile.occupation}` : null,
    profile.monthlyIncome !== undefined ? `Monthly income: BDT ${profile.monthlyIncome}` : null,
    profile.maritalStatus ? `Marital status: ${profile.maritalStatus}` : null,
    profile.education ? `Education: ${profile.education}` : null,
  ]
    .filter(Boolean)
    .join(' · ') || 'No profile details recorded yet.';

  const situation = plan.lifeEvents.length > 0
    ? `Detected life events: ${plan.lifeEvents.join(', ')}`
    : 'No specific life event detected.';

  const eligibilityBlock = plan.opportunities
    .map((o) => {
      const line = (sign: string, c: PlannedCondition) =>
        `    ${sign} ${pickLocalised(c.reason, locale)}${c.provenance ? ` [${PROVENANCE_TAG[c.provenance.source] ?? c.provenance.source}]` : c.state === 'unknown' ? ' [not known]' : ''}`;
      const rows = o.conditions.map((c) =>
        line(c.state === 'met' ? '+' : c.state === 'unknown' ? '?' : c.soft ? '~' : '-', c),
      );
      const tag = VERIFICATION_TAG[o.verificationStatus];
      return [`  ${pickLocalised(o.title, locale)} — DECISION: ${o.outcome}${tag ? ` (${tag})` : ''}`, ...rows].join('\n');
    })
    .join('\n');

  const contextBlock = plan.opportunities
    .map((o) => {
      const lines = [
        `### ${pickLocalised(o.title, locale)}`,
        `Organisation: ${pickLocalised(o.organisation, locale)}`,
        pickLocalised(o.summary, locale),
        o.benefitAmount !== null ? `Amount: BDT ${o.benefitAmount.toFixed(2)} ${o.benefitPeriod ?? ''}` : null,
        o.deadline ? `Deadline: ${formatDate(o.deadline, 'en')}` : 'Deadline: rolling, open all year',
        o.nextStep ? `First step: ${pickLocalised(o.nextStep, locale)}` : null,
        o.sourceUrl ? `Source: ${o.sourceUrl}` : null,
      ].filter(Boolean);
      return lines.join('\n');
    })
    .join('\n\n');

  const citationBlock = plan.citations.map((c) => `[${c.title}] ${c.excerpt}`).join('\n\n');

  const system = PROMPTS.system.render({
    profile: profileSummary,
    situation,
    eligibility: eligibilityBlock || 'No eligibility decisions available.',
    context: [contextBlock, citationBlock].filter(Boolean).join('\n\n---\n\n') || 'NO CONTEXT AVAILABLE.',
  });

  const historyBlock = history
    .slice(-4)
    .map((m) => `${m.role === 'user' ? 'Citizen' : 'Nagorik Sathi'}: ${m.content.slice(0, 400)}`)
    .join('\n');

  const missing = (() => {
    if (!plan.missingFieldLabel) return 'more information';
    const label = pickLocalised(plan.missingFieldLabel, locale);
    const v = plan.clarificationValues;
    const stated = v?.stated ? pickLocalised(v.stated, locale) : '';
    if (plan.clarificationKind === 'confirm') return `confirmation of their ${label} (we understood "${stated}" but are not sure)`;
    if (plan.clarificationKind === 'conflict') return `which ${label} is correct: "${v?.profile ? pickLocalised(v.profile, locale) : ''}" (profile) or "${stated}" (what they said)`;
    return label;
  })();

  const userPrompt =
    plan.kind === 'clarification'
      ? PROMPTS.clarification.render({ message, missing, language })
      : PROMPTS.conversation.render({
          message,
          language,
          history: historyBlock ? `Earlier in this conversation:\n${historyBlock}` : '',
        });

  const result = await provider.generate({
    system,
    user: userPrompt,
    maxTokens: 900,
    temperature: 0.3,
    ...(signal ? { signal } : {}),
  });

  return { text: result.text, tokensIn: result.tokensIn, tokensOut: result.tokensOut };
}

