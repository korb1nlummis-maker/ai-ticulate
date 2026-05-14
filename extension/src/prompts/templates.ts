/**
 * Meta-prompt templates — the "prebuilt nuance". These produce the text the
 * extension types into the user's AI chat. Each asks the AI to respond in a
 * format the response parser (parser/response-parser.ts) can read. The format
 * markers (### QUESTION, ### SUGGESTIONS, ### OPTION n, ### STATUS) are a
 * contract — keep them in sync with the parser.
 */

const FORMAT_RULES = `
Format your reply EXACTLY like this so a tool can read it:
- If you need to ask clarifying questions, output one or more blocks:
  ### QUESTION
  <the question, one short sentence>
  ### SUGGESTIONS
  <2-5 short suggested answers, one per line>
- After your questions (or if you need none), output:
  ### STATUS
  ready
  (use "ready" if you have enough to proceed, otherwise "need-more")
Do not output anything else outside these blocks.
`.trim();

export function buildRefinePrompt(userRequest: string): string {
  return `I want help getting a great result from you. My request is:

"${userRequest}"

Before answering it, help me sharpen it. Ask me any clarifying questions you need to understand my goal, audience, constraints, and what a great result looks like. Ask only what genuinely matters — at most 4 questions.

${FORMAT_RULES}`;
}

export function buildOptionsPrompt(input: {
  goalSummary: string;
  answers: string[];
}): string {
  const answersBlock =
    input.answers.length > 0
      ? `Here is what I've told you so far:\n${input.answers.map((a) => `- ${a}`).join('\n')}`
      : 'I have not answered any clarifying questions yet.';

  return `My goal: ${input.goalSummary}

${answersBlock}

Now give me 5 distinct, detailed prompt options I could send you to get a great result. Each option should be a complete, ready-to-send prompt — more specific and richer than my original request. Make the 5 genuinely different in angle, not the same prompt at 5 lengths. Where a useful detail could be personalized, leave a blank like [___].

Format your reply EXACTLY like this:
### OPTION 1
<the full prompt text>
### OPTION 2
<the full prompt text>
### OPTION 3
<the full prompt text>
### OPTION 4
<the full prompt text>
### OPTION 5
<the full prompt text>
Do not output anything else.`;
}

/**
 * The finalize step. Intentionally an identity function — and it stays one.
 *
 * By the time we reach this step the user has picked one of the 5 options
 * produced by `buildOptionsPrompt`. Each option was generated as "a complete,
 * ready-to-send prompt"; the user may also have edited it. That text IS the
 * prompt the user wants to send. ai-ticulate's job here is to get out of the
 * way: wrapping, prefixing, or reformatting it would mangle the user's
 * carefully chosen prompt and change the result they get from their AI.
 *
 * This function is kept (rather than inlined) deliberately: it's the named
 * contract point that says "this is the step where the chosen prompt goes
 * through untouched." If a future change ever needs to transform the
 * finalize-stage prompt, this is the single place to do it.
 */
export function buildFinalizePrompt(chosenPrompt: string): string {
  return chosenPrompt;
}
