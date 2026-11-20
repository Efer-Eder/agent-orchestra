// Records the real app (demo mode) into timed PNG frames for the README GIFs.
//
//   node scripts/readme-media/capture.mjs [baseUrl] [lang...]
//
// Needs a running dev server (npm run dev) and Google Chrome installed.
// Output: scripts/readme-media/out/frames/<lang>/<scene>/NNNN.png + timing.json
import { chromium } from 'playwright-core';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out', 'frames');
const BASE = process.argv[2] ?? 'http://localhost:5173';
const LANGS = process.argv.slice(3).length ? process.argv.slice(3) : ['pt', 'en'];
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const VIEWPORT = { width: 1280, height: 800 };

const TEXT = {
  pt: {
    locale: 'pt-BR',
    project: 'meu-saas',
    folder: 'C:\\dev\\meu-saas',
    request: 'Adicionar login com Google mantendo o login por senha. Cobrir com testes.',
    approve: 'Aprovar plano',
    completed: 'Concluída',
    agents: 'Agentes',
    talk: 'Conversar',
    chat: 'Oi, Octo! Como funciona uma sessão?',
    settings: 'Configurações',
    light: 'Claro',
    dark: 'Escuro',
    other: 'English (US)',
    self: 'Português (Brasil)',
  },
  en: {
    locale: 'en-US',
    project: 'my-saas',
    folder: '~/dev/my-saas',
    request: 'Add Google sign-in while keeping password login. Cover it with tests.',
    approve: 'Approve plan',
    completed: 'Completed',
    agents: 'Agents',
    talk: 'Chat',
    chat: 'Hi Octo! How does a session work?',
    settings: 'Settings',
    light: 'Light',
    dark: 'Dark',
    other: 'Português (Brasil)',
    self: 'English (US)',
  },
};

function seed(t, withProject) {
  const now = new Date().toISOString();
  const data = {
    version: 1,
    projects: withProject
      ? [{ id: 'p1', name: t.project, rootLabel: t.folder, createdAt: now }]
      : [],
    sessions: [],
    chats: {},
    activeProjectId: withProject ? 'p1' : null,
    settings: { kind: 'mock', baseUrl: 'https://api.openai.com/v1', model: '' },
  };
  return { data: JSON.stringify(data), locale: t.locale };
}

/** Captures screenshots in the background, remembering how long each frame stays. */
function recorder(page, dir, shot = {}) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const timing = [];
  let running = true;
  let last = null;
  const loop = (async () => {
    let i = 0;
    while (running) {
      const started = Date.now();
      const buf = await page.screenshot({ type: 'png', ...shot });
      const name = String(i++).padStart(4, '0') + '.png';
      writeFileSync(join(dir, name), buf);
      if (last) last.ms = started - last.at;
      last = { file: name, at: started, ms: 100 };
      timing.push(last);
      const spent = Date.now() - started;
      if (spent < 70) await page.waitForTimeout(70 - spent);
    }
  })();
  return {
    async stop() {
      running = false;
      await loop;
      if (last) last.ms = Math.max(400, Date.now() - last.at);
      writeFileSync(
        join(dir, 'timing.json'),
        JSON.stringify(timing.map(({ file, ms }) => ({ file, ms }))),
      );
      return timing.length;
    },
  };
}

async function open(
  browser,
  t,
  { withProject = true, theme = 'dark', path = '/', scale = 1 } = {},
) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: scale });
  const s = seed(t, withProject);
  await context.addInitScript(
    ([data, locale, theme]) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.clear();
      localStorage.setItem('agent-orchestra.data.v1', data);
      localStorage.setItem('agent-orchestra.locale', locale);
      localStorage.setItem('agent-orchestra.theme', theme);
    },
    [s.data, s.locale, theme],
  );
  // No spell-check squiggles in the recordings.
  await context.addInitScript(() => {
    new MutationObserver(() => {
      for (const el of document.querySelectorAll('textarea, input')) el.spellcheck = false;
    }).observe(document, { childList: true, subtree: true });
  });
  const page = await context.newPage();
  await page.goto(BASE + path);
  await page.waitForTimeout(900);
  return { context, page };
}

const scenes = {
  // Octo waving on the welcome screen (cropped later for the banner).
  async banner(browser, t, dir) {
    const { context, page } = await open(browser, t, { withProject: false, scale: 3 });
    // Transparent page so only Octo is captured.
    await page.addStyleTag({
      content:
        '*, *::before, *::after { background: transparent !important; border-color: transparent !important; }',
    });
    const box = await page.locator('svg.octo').first().boundingBox();
    const pad = 18;
    const clip = {
      x: box.x - pad,
      y: box.y - pad,
      width: box.width + pad * 2,
      height: box.height + pad * 2,
    };
    const rec = recorder(page, dir, { clip, omitBackground: true });
    await page.waitForTimeout(3600);
    await rec.stop();
    await context.close();
  },

  async flow(browser, t, dir) {
    const { context, page } = await open(browser, t);
    const rec = recorder(page, dir);
    await page.waitForTimeout(1100);
    const box = page.locator('textarea').first();
    await box.click();
    await box.pressSequentially(t.request, { delay: 22 });
    await page.waitForTimeout(350);
    await page.keyboard.press('Enter');
    const approve = page.getByRole('button', { name: t.approve });
    await approve.waitFor();
    await page.waitForTimeout(1500);
    await approve.hover();
    await page.waitForTimeout(350);
    await approve.click();
    await page.getByText(t.completed, { exact: true }).first().waitFor();
    await page.waitForTimeout(1300);
    await page.locator('main code').first().click();
    await page.waitForTimeout(2200);
    await rec.stop();
    await context.close();
  },

  async agents(browser, t, dir) {
    const { context, page } = await open(browser, t);
    const rec = recorder(page, dir);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: t.agents }).click();
    await page.waitForTimeout(2600);
    await page.getByRole('button', { name: t.talk }).first().click();
    await page.waitForTimeout(700);
    const box = page.locator('textarea').first();
    await box.pressSequentially(t.chat, { delay: 30 });
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3200);
    await rec.stop();
    await context.close();
  },

  async settings(browser, t, dir) {
    const { context, page } = await open(browser, t);
    await page.getByRole('button', { name: t.settings }).click();
    await page.waitForTimeout(500);
    const rec = recorder(page, dir);
    await page.waitForTimeout(1000);
    await page.getByRole('radio', { name: t.light }).click();
    await page.waitForTimeout(1300);
    await page.getByRole('radio', { name: t.other }).click();
    await page.waitForTimeout(1500);
    const other = t === TEXT.pt ? TEXT.en : TEXT.pt;
    await page.getByRole('radio', { name: other.dark }).click();
    await page.waitForTimeout(1300);
    await page.getByRole('radio', { name: t.self }).click();
    await page.waitForTimeout(1500);
    await rec.stop();
    await context.close();
  },
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
try {
  for (const lang of LANGS) {
    for (const [name, scene] of Object.entries(scenes)) {
      const dir = join(OUT, lang, name);
      process.stdout.write(`${lang}/${name}... `);
      await scene(browser, TEXT[lang], dir);
      console.log('ok');
    }
  }
} finally {
  await browser.close();
}
