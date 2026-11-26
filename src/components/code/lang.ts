/** Language detection and fence splitting; no highlight.js here, so it stays in the main bundle. */

/** Languages bundled in the highlighter chunk (see highlighter.ts). */
const LANGUAGES = new Set([
  'bash',
  'css',
  'go',
  'java',
  'javascript',
  'json',
  'markdown',
  'python',
  'rust',
  'sql',
  'typescript',
  'xml',
  'yaml',
]);

const BY_EXTENSION: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  css: 'css',
  scss: 'css',
  html: 'xml',
  xml: 'xml',
  svg: 'xml',
  vue: 'xml',
  md: 'markdown',
  markdown: 'markdown',
  rs: 'rust',
  py: 'python',
  go: 'go',
  java: 'java',
  kt: 'java',
  sql: 'sql',
  sh: 'bash',
  bash: 'bash',
  ps1: 'bash',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'yaml',
};

const ALIASES: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  sh: 'bash',
  shell: 'bash',
  powershell: 'bash',
  html: 'xml',
  md: 'markdown',
  py: 'python',
  rs: 'rust',
  yml: 'yaml',
};

/** Language for a file path, from its extension. */
export function languageForPath(path: string): string | null {
  const ext = path.toLowerCase().split('.').pop() ?? '';
  return BY_EXTENSION[ext] ?? null;
}

/** Language for a fenced code block's info string (```ts). */
export function languageForFence(info: string): string | null {
  const name = info.trim().toLowerCase().split(/\s+/)[0] ?? '';
  if (!name) return null;
  if (LANGUAGES.has(name)) return name;
  return ALIASES[name] ?? null;
}

export type Part =
  { kind: 'text'; text: string } | { kind: 'code'; code: string; language: string | null };

/** Splits a message into prose and fenced code blocks (``` ... ```). */
export function splitFences(content: string): Part[] {
  const parts: Part[] = [];
  const fence = /```([^\n`]*)\n([\s\S]*?)(?:```|$)/g;
  let last = 0;
  for (const m of content.matchAll(fence)) {
    if (m.index > last) parts.push({ kind: 'text', text: content.slice(last, m.index) });
    parts.push({
      kind: 'code',
      code: (m[2] ?? '').replace(/\n$/, ''),
      language: languageForFence(m[1] ?? ''),
    });
    last = m.index + m[0].length;
  }
  if (last < content.length) parts.push({ kind: 'text', text: content.slice(last) });
  return parts;
}
