import { z } from 'zod';
import { OPPORTUNITY_CATEGORIES, LIFE_EVENTS } from '@/lib/domain/enums';
import { getProvider } from '@/modules/ai/providers';
import type { CandidateDraft, Evidence } from './extract';

/**
 * Optional AI pass over a page the rules have already read.
 *
 * It only fills fields that are still empty — mostly the English versions,
 * which the rules never invent — and every field it fills is labelled in the
 * evidence so the reviewer knows to check it. It runs only when a live model is
 * configured AND the source does not reserve its content from AI use. Any
 * failure (no model, timeout, malformed answer) leaves the draft as it was.
 */

const aiAnswer = z
  .object({
    title: z.string().max(200),
    titleBn: z.string().max(200),
    summary: z.string().max(500),
    summaryBn: z.string().max(500),
    description: z.string().max(2500),
    benefits: z.string().max(500),
    benefitsBn: z.string().max(500),
    category: z.enum(OPPORTUNITY_CATEGORIES),
    lifeEvents: z.array(z.enum(LIFE_EVENTS)).max(6),
    applicationSteps: z.array(z.object({ en: z.string().max(300), bn: z.string().max(300) })).max(8),
  })
  .partial();

const SYSTEM = [
  'You read Bangladesh government programme pages and fill a form for a public-service directory.',
  'Use ONLY facts stated in the page text. If the page does not state something, leave that field out.',
  'Never state eligibility rules, amounts or dates that are not in the text.',
  'English fields are faithful translations of the Bangla text, in plain words.',
  `category is one of: ${OPPORTUNITY_CATEGORIES.join(', ')}.`,
  `lifeEvents are any of: ${LIFE_EVENTS.join(', ')}.`,
  'Answer with one JSON object and nothing else, with these optional keys:',
  'title, titleBn, summary, summaryBn, description, benefits, benefitsBn, category, lifeEvents, applicationSteps ([{en, bn}]).',
].join('\n');

const AI_NOTE = 'Filled by AI from the page text. Check it against the source before publishing.';

export async function aiFillDraft(
  pageText: string,
  draft: CandidateDraft,
  evidence: Evidence,
): Promise<{ draft: CandidateDraft; evidence: Evidence; used: boolean }> {
  const provider = getProvider();
  if (!provider.isLive) return { draft, evidence, used: false };

  let answer: z.infer<typeof aiAnswer>;
  try {
    const result = await provider.generate({
      system: SYSTEM,
      user: pageText.slice(0, 12_000),
      maxTokens: 1800,
      temperature: 0,
      signal: AbortSignal.timeout(45_000),
    });
    if (result.degraded) return { draft, evidence, used: false };
    const json = result.text.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, '$1');
    answer = aiAnswer.parse(JSON.parse(json));
  } catch {
    return { draft, evidence, used: false };
  }

  const next: CandidateDraft = { ...draft };
  const notes: Evidence = { ...evidence };
  let used = false;
  const fill = <K extends keyof CandidateDraft>(key: K, value: CandidateDraft[K] | undefined) => {
    const current = next[key];
    const empty = current === undefined || current === null || current === '' || (Array.isArray(current) && current.length === 0);
    const hasValue = value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0);
    if (empty && hasValue) {
      next[key] = value;
      notes[key] = AI_NOTE;
      used = true;
    }
  };

  fill('title', answer.title?.trim());
  fill('titleBn', answer.titleBn?.trim());
  fill('summary', answer.summary?.trim());
  fill('summaryBn', answer.summaryBn?.trim());
  fill('description', answer.description?.trim());
  fill('benefits', answer.benefits?.trim());
  fill('benefitsBn', answer.benefitsBn?.trim());
  fill('category', answer.category);
  fill('lifeEvents', answer.lifeEvents);
  fill(
    'applicationProcess',
    answer.applicationSteps
      ?.filter((s) => s.en.trim() && s.bn.trim())
      .map((s, i) => ({ step: i + 1, en: s.en.trim(), bn: s.bn.trim() })),
  );
  return { draft: next, evidence: notes, used };
}
