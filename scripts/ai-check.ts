/* eslint-disable no-console */
import './load-env';
import { env, resolveAiMode, aiConfigProblems } from '../src/lib/config/env';
import { getProvider } from '../src/modules/ai/providers';

/**
 * Verifies the configured AI provider end to end, before you rely on it.
 *
 * Three questions, answered against the live endpoint rather than assumed:
 *   1. Is the key accepted?
 *   2. Which model ids does this account actually expose? (You cannot guess a
 *      vendor's current model string, and a wrong one is a 404 at request time.)
 *   3. Does the configured model return a reasoning trace despite being asked
 *      for a plain answer?
 *
 * Run:  npm run ai:check
 */

function mask(value: string | undefined): string {
  if (!value) return '(not set)';
  return value.length <= 10 ? '*'.repeat(value.length) : `${value.slice(0, 4)}…${value.slice(-4)}`;
}

async function listModels(baseUrl: string, key: string): Promise<string[] | null> {
  const url = `${baseUrl.replace(/\/+$/, '')}/models`;
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
    if (!response.ok) {
      console.log(`  model list: ${response.status} ${response.statusText} (endpoint may not expose /models)`);
      return null;
    }
    const body = (await response.json()) as { data?: { id?: string }[] };
    return (body.data ?? []).map((m) => m.id ?? '').filter(Boolean);
  } catch (error) {
    console.log(`  model list: unreachable — ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function main() {
  const mode = resolveAiMode();

  console.log('Shebar Janala — AI provider check\n');
  console.log(`  resolved provider   ${mode}${env.AI_PROVIDER ? ' (forced by AI_PROVIDER)' : ' (from the first key present)'}`);

  const problems = aiConfigProblems();
  if (problems.length > 0) {
    console.log('');
    for (const problem of problems) console.warn(`  ! ${problem}`);
  }

  if (mode === 'simulated') {
    console.log('\n  No provider key is set, so responses come from the deterministic composer.');
    console.log('  The UI reports this as "Simulated AI" on every screen. Set a key to change it.\n');
    return;
  }

  if (mode === 'deepseek') {
    console.log(`  base url            ${env.DEEPSEEK_BASE_URL}`);
    console.log(`  model               ${env.DEEPSEEK_MODEL}`);
    console.log(`  api key             ${mask(env.DEEPSEEK_API_KEY)}`);
    console.log(
      `  thinking            ${env.DEEPSEEK_THINKING}` +
        (env.DEEPSEEK_THINKING === 'disabled' ? '  (no chain of thought is requested or accepted)' : '  ← costs tokens this product discards'),
    );
    if (env.DEEPSEEK_REASONING_EFFORT) console.log(`  reasoning effort    ${env.DEEPSEEK_REASONING_EFFORT}`);
    console.log(`  extra body          ${env.DEEPSEEK_EXTRA_BODY ?? '(none)'}`);
    console.log('');

    const models = await listModels(env.DEEPSEEK_BASE_URL, env.DEEPSEEK_API_KEY ?? '');
    if (models) {
      console.log(`  models available    ${models.join(', ') || '(none returned)'}`);
      if (!models.includes(env.DEEPSEEK_MODEL)) {
        console.warn(
          `  ! DEEPSEEK_MODEL "${env.DEEPSEEK_MODEL}" is not in that list. Set it to one of the ids above.`,
        );
      }
      const reasoners = models.filter((m) => /reason|think/i.test(m));
      if (reasoners.length > 0) {
        console.log(`  reasoning-only ids  ${reasoners.join(', ')}  ← avoid; thinking cannot be turned off on these`);
      }
    }
    console.log('');
  } else {
    console.log(`  model               ${mode === 'anthropic' ? env.ANTHROPIC_MODEL : env.OPENAI_MODEL}`);
    console.log(
      `  api key             ${mask(mode === 'anthropic' ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY)}\n`,
    );
  }

  // ---- one real round trip -------------------------------------------------
  const provider = getProvider();
  console.log('  sending one test request…');

  try {
    const result = await provider.generate({
      system:
        'You are a helpful assistant for Bangladeshi citizens. Answer in one short sentence. Do not explain your reasoning.',
      user: 'In one sentence: what is a widow allowance?',
      maxTokens: 120,
      temperature: 0.3,
    });

    console.log('');
    console.log(`  ✓ live response     ${result.latencyMs} ms`);
    console.log(`    engine / model    ${result.engine} / ${result.model}`);
    console.log(`    tokens in / out   ${result.tokensIn} / ${result.tokensOut}`);
    console.log(`    text              ${result.text.replace(/\s+/g, ' ').slice(0, 160)}`);
    console.log('');
    console.log('  The UI will now show live answers instead of the "Simulated AI" badge.');
    console.log('  Eligibility decisions, programmes, reasons and citations are unchanged —');
    console.log('  the model only rewrites the plan the deterministic layer already produced.\n');
  } catch (error) {
    console.error('');
    console.error(`  ✗ request failed: ${error instanceof Error ? error.message : String(error)}`);
    console.error('');
    console.error('  Common causes:');
    console.error('    401 — the key is wrong, or has no credit');
    console.error('    404 — the model id does not exist on this account (see the list above)');
    console.error('    400 — DEEPSEEK_EXTRA_BODY contains a field this endpoint rejects');
    console.error('');
    console.error('  The app itself stays usable: a failed provider call falls back to the');
    console.error('  deterministic composer and marks the answer degraded, rather than erroring.\n');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
