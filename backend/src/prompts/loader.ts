import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROMPTS_DIR = join(__dirname, '../../prompts');

export type PromptTemplate = {
  name: string;
  description: string;
  model: string;
  temperature: number;
  template: string;
};

const cache = new Map<string, PromptTemplate>();

export function loadPrompt(name: string): PromptTemplate {
  const cached = cache.get(name);
  if (cached) return cached;

  let raw: string;
  try {
    raw = readFileSync(join(PROMPTS_DIR, `${name}.md`), 'utf8');
  } catch {
    throw new Error(`Prompt not found: ${name}`);
  }
  raw = raw.replace(/\r\n/g, '\n');

  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    throw new Error(`Prompt ${name} missing frontmatter`);
  }
  const fm = fmMatch[1]!;
  const body = fmMatch[2]!;

  const fmFields: Record<string, string> = {};
  for (const line of fm.split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) fmFields[m[1]!] = m[2]!.trim();
  }

  const tpl: PromptTemplate = {
    name: fmFields.name ?? name,
    description: fmFields.description ?? '',
    model: fmFields.model ?? 'claude-haiku-4-5',
    temperature: Number(fmFields.temperature ?? '0.7'),
    template: body.trim(),
  };
  cache.set(name, tpl);
  return tpl;
}

export function renderPrompt(name: string, vars: Record<string, string>): string {
  const tpl = loadPrompt(name);
  const required = [...tpl.template.matchAll(/\{\{([\w.-]+)\}\}/g)].map((m) => m[1]!);
  const missing = required.filter((k) => !(k in vars));
  if (missing.length > 0) {
    throw new Error(`renderPrompt(${name}): missing variables ${missing.join(', ')}`);
  }
  return tpl.template.replace(/\{\{([\w.-]+)\}\}/g, (_, k) => vars[k] ?? '');
}
