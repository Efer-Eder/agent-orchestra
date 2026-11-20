// Builds the project page plus the web demo into dist-site/, mirroring the
// public path: dist-site/projeto/agent-orchestra/{index.html, demo/}.
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = '/projeto/agent-orchestra/';
const out = join(root, 'dist-site');
const target = join(out, ...base.split('/').filter(Boolean));

rmSync(out, { recursive: true, force: true });
mkdirSync(target, { recursive: true });

execSync(`npx vite build --base=${base}demo/ --outDir "${join(target, 'demo')}" --emptyOutDir`, {
  cwd: root,
  stdio: 'inherit',
});
cpSync(join(root, 'site', 'index.html'), join(target, 'index.html'));

console.log(`\nSite pronto em ${target}`);
