#!/usr/bin/env node
// Numerola tutor bridge: a tiny local HTTP server that lets the game ask an
// AI command-line tool (Claude Code, Gemini CLI or Codex CLI) for hints.
//
//   npm run tutor                       # auto-detect an installed CLI
//   npm run tutor -- --provider claude  # or gemini, codex, mock
//   npm run tutor -- --model haiku      # optional model for the CLI
//
// The server only listens on 127.0.0.1 and only answers pages served from
// localhost. The answer to the problem is never sent to the model.
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { buildPrompt, loadRules, mockReply, sanitizeRequest } from './prompt.mjs';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : process.env[`TUTOR_${name.toUpperCase()}`] ?? fallback;
}

const PORT = Number(arg('port', 8787));
const MODEL = arg('model', '');
const TIMEOUT_MS = Number(arg('timeout', 90000));
const RULES = loadRules();

/**
 * How to call each CLI in one-shot, tool-less mode. `sys` is the tutor rules,
 * `user` is the request prompt.
 */
const PROVIDERS = {
  claude: {
    bin: 'claude',
    args: (sys, user) => [
      '-p',
      '--system-prompt', sys,
      '--tools', '',
      '--strict-mcp-config',
      '--no-session-persistence',
      '--output-format', 'text',
      ...(MODEL ? ['--model', MODEL] : []),
      user,
    ],
  },
  gemini: {
    bin: 'gemini',
    args: (sys, user) => [...(MODEL ? ['-m', MODEL] : []), '-p', `${sys}\n\n---\n\n${user}`],
  },
  codex: {
    bin: 'codex',
    args: (sys, user) => ['exec', '--skip-git-repo-check', '--sandbox', 'read-only', ...(MODEL ? ['-m', MODEL] : []), `${sys}\n\n---\n\n${user}`],
  },
};

function installed(bin) {
  const r = spawnSync(bin, ['--version'], { stdio: 'ignore', timeout: 10000, shell: process.platform === 'win32' });
  return r.status === 0;
}

function pickProvider() {
  const wanted = arg('provider', 'auto');
  if (wanted === 'mock') return 'mock';
  if (wanted !== 'auto') {
    if (!PROVIDERS[wanted]) throw new Error(`Unknown provider "${wanted}". Use claude, gemini, codex or mock.`);
    if (!installed(PROVIDERS[wanted].bin)) throw new Error(`"${PROVIDERS[wanted].bin}" is not installed or not on PATH.`);
    return wanted;
  }
  for (const name of Object.keys(PROVIDERS)) if (installed(PROVIDERS[name].bin)) return name;
  throw new Error('No AI CLI found. Install Claude Code, Gemini CLI or Codex CLI, or run with --provider mock.');
}

// An empty working directory, so the CLI has no project files to look at.
const SANDBOX = mkdtempSync(path.join(os.tmpdir(), 'numerola-tutor-'));

function runCli(provider, user) {
  const p = PROVIDERS[provider];
  return new Promise((resolve, reject) => {
    const child = spawn(p.bin, p.args(RULES, user), {
      cwd: SANDBOX,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      env: { ...process.env, NO_COLOR: '1' },
    });
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('the tutor took too long to answer'));
    }, TIMEOUT_MS);
    child.stdout.on('data', (d) => {
      out += d;
      if (out.length > 20000) child.kill('SIGKILL');
    });
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 && out.trim()) resolve(out.trim());
      else reject(new Error(err.trim().split('\n').pop() || `exit code ${code}`));
    });
  });
}

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

function send(res, status, body, origin) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };
  if (origin && LOCAL_ORIGIN.test(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers.Vary = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

export function createServer(provider, answer = (req) => (provider === 'mock' ? Promise.resolve(mockReply(req)) : runCli(provider, buildPrompt(req)))) {
  let busy = false;
  return http.createServer((req, res) => {
    const origin = req.headers.origin;
    // refuse DNS-rebinding tricks: the Host must be this machine too
    if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.headers.host ?? '')) return send(res, 403, { error: 'bad host' });
    if (origin && !LOCAL_ORIGIN.test(origin)) return send(res, 403, { error: 'only pages on this computer may use the tutor' });
    if (req.method === 'OPTIONS') return send(res, 204, {}, origin);
    if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true, provider }, origin);
    if (req.method !== 'POST' || req.url !== '/hint') return send(res, 404, { error: 'not found' }, origin);
    if (busy) return send(res, 429, { error: 'the tutor is still thinking about the last question' }, origin);
    let raw = '';
    req.on('data', (d) => {
      raw += d;
      if (raw.length > 32000) req.destroy();
    });
    req.on('end', async () => {
      let body;
      try {
        body = sanitizeRequest(JSON.parse(raw || '{}'));
      } catch (e) {
        return send(res, 400, { error: e.message }, origin);
      }
      busy = true;
      try {
        const reply = await answer(body);
        send(res, 200, { reply: reply.replace(/\s+/g, ' ').trim() }, origin);
      } catch (e) {
        send(res, 502, { error: e.message }, origin);
      } finally {
        busy = false;
      }
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('server.mjs')) {
  let provider;
  try {
    provider = pickProvider();
  } catch (e) {
    console.error(`Tutor: ${e.message}`);
    process.exit(1);
  }
  createServer(provider).listen(PORT, '127.0.0.1', () => {
    console.log(`Numerola tutor is listening on http://127.0.0.1:${PORT} using ${provider}${MODEL ? ` (${MODEL})` : ''}.`);
    console.log('Start the game with "npm run dev" and open it on this computer. Press Ctrl+C to stop.');
  });
}
