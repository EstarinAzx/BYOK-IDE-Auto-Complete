// ----------------- homeStore.test.ts — Wisp home store: fs layer against real tmp dirs ----------------- //

/*
 * Depends on:
 *   - vitest: test runner.
 *   - node fs/os/path: every test gets its own mkdtemp sandbox — no mocks, real files.
 *   - ./homeStore: WispHome (read/write/watch) + wispHomeDir under test.
 *
 * Data shapes:
 *   - WispConfig / WispAuth (from ./home): what the store reads and writes.
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { WispHome, wispHomeDir } from '../src/homeStore';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'wisp-home-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

// The sandbox path points at a subdir that does NOT exist yet — creation on demand is part of the contract.
const home = () => new WispHome(join(dir, '.wisp'));

// ----------------------------- wispHomeDir ----------------------------- //

describe('wispHomeDir', () => {
  test('defaults under the user profile, WISP_HOME overrides', () => {
    expect(wispHomeDir().endsWith('.wisp')).toBe(true);
    process.env.WISP_HOME = join(dir, 'custom');
    try { expect(wispHomeDir()).toBe(join(dir, 'custom')); }
    finally { delete process.env.WISP_HOME; }
  });
});

// ----------------------------- read/write config ----------------------------- //

describe('config read/write', () => {
  test('missing store reads as empty config and configExists() false', () => {
    const h = home();
    expect(h.readConfig()).toEqual({});
    expect(h.configExists()).toBe(false);
  });

  test('writeConfig merges the patch over disk state and round-trips', () => {
    const h = home();
    h.writeConfig({ provider: 'groq' });
    h.writeConfig({ effort: 'high' });
    expect(h.readConfig()).toEqual({ provider: 'groq', effort: 'high' });
    expect(h.configExists()).toBe(true);
  });

  // #181: writeConfig is read-merge-write, so ANY read that silently degrades to {} does not merely ignore
  // the file — the next settings change persists {} + patch over it and the real config is gone from disk.
  // A UTF-8 BOM is the realistic way in: Notepad and PowerShell 5.1's `Out-File -Encoding utf8` write one.
  test('a BOM-prefixed config survives being read AND the next write (#181)', () => {
    const h = home();
    const original = {
      provider: 'codex',
      routing: { families: { opus: { providerId: 'anthropic', model: 'claude-opus-5' } }, aliases: [] },
    };
    h.writeConfig(original);
    // Simulate the user opening config.json in an editor that saves UTF-8 with a BOM.
    const path = join(dir, '.wisp', 'config.json');
    writeFileSync(path, '﻿' + readFileSync(path, 'utf8'), 'utf8');

    expect(h.readConfig()).toEqual(original);
    h.writeConfig({ effort: 'low' }); // any ordinary settings change
    expect(h.readConfig()).toEqual({ ...original, effort: 'low' });
  });

  // #182: the other half of #181. The BOM is fixed, but the read-merge-write MECHANISM still destroys any
  // store it cannot parse — a truncated write, a crash mid-flush, a hand-edit typo. Reads stay permissive
  // (wisp still starts on defaults); the WRITE is what must refuse, because overwriting a file we admit we
  // did not understand is what turns "we ignored your config" into "we deleted your config".
  test('a corrupt config is refused by the next write, not overwritten (#182)', () => {
    const h = home();
    h.writeConfig({ provider: 'codex', effort: 'high' });
    const path = join(dir, '.wisp', 'config.json');
    writeFileSync(path, '{"provider":"codex","eff', 'utf8'); // truncated mid-write
    const before = readFileSync(path, 'utf8');

    expect(() => h.writeConfig({ effort: 'low' })).toThrow(/config\.json/);
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  // Valid JSON, but not a store. parseObject rejects it exactly like a syntax error, so the same
  // read-merge-write erasure follows — the refusal has to cover it or the hole is only half closed.
  test('a config holding valid JSON that is not an object is refused too (#182)', () => {
    const h = home();
    const path = join(dir, '.wisp', 'config.json');
    h.writeConfig({ provider: 'codex' });
    writeFileSync(path, '[1,2,3]', 'utf8');

    expect(() => h.writeConfig({ effort: 'low' })).toThrow(/config\.json/);
    expect(readFileSync(path, 'utf8')).toBe('[1,2,3]');
  });

  // Guard on the other side of the line: "no content" is not "content we failed to understand". A missing
  // or empty file must stay writable or the refusal bricks first run and any zero-length truncation.
  test('an absent or empty config is still writable — nothing is lost by overwriting it (#182)', () => {
    const h = home();
    expect(() => h.writeConfig({ provider: 'groq' })).not.toThrow(); // absent
    writeFileSync(join(dir, '.wisp', 'config.json'), '   \n', 'utf8');
    expect(() => h.writeConfig({ provider: 'groq' })).not.toThrow(); // empty/whitespace
    expect(h.readConfig()).toEqual({ provider: 'groq' });
  });

  test('an undefined patch value deletes the field on disk', () => {
    const h = home();
    h.writeConfig({ provider: 'groq', customBaseUrl: 'https://x' });
    h.writeConfig({ customBaseUrl: undefined });
    expect(h.readConfig()).toEqual({ provider: 'groq' });
  });

  test('unknown keys written by another face (the TUI) survive an extension write', () => {
    const h = home();
    h.writeConfig({ provider: 'groq' });
    const file = join(dir, '.wisp', 'config.json');
    writeFileSync(file, JSON.stringify({ provider: 'groq', tuiTheme: 'dark' }));
    h.writeConfig({ effort: 'low' });
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({ provider: 'groq', tuiTheme: 'dark', effort: 'low' });
  });

  test('writes leave no .tmp litter behind', () => {
    const h = home();
    h.writeConfig({ provider: 'groq' });
    h.writeAuth({ bridgeSecret: 's' });
    expect(readdirSync(join(dir, '.wisp')).sort()).toEqual(['auth.json', 'config.json']);
  });
});

// ----------------------------- read/write auth ----------------------------- //

describe('auth read/write', () => {
  test('missing auth reads as empty and authExists() false; write round-trips', () => {
    const h = home();
    expect(h.readAuth()).toEqual({});
    expect(h.authExists()).toBe(false);
    h.writeAuth({ keys: { groq: 'gk' } });
    expect(h.readAuth()).toEqual({ keys: { groq: 'gk' } });
    expect(h.authExists()).toBe(true);
  });

  // #181, the higher-stakes half: writeAuth is read-merge-write too, so a BOM plus a single sign-in used to
  // wipe every stored API key and OAuth bundle off disk.
  test('a BOM-prefixed auth store survives a read AND a subsequent sign-in (#181)', () => {
    const h = home();
    const original = { keys: { groq: 'gk-real', openai: 'sk-real' }, codex: { accessToken: 'at', refreshToken: 'rt' } };
    h.writeAuth(original);
    const path = join(dir, '.wisp', 'auth.json');
    writeFileSync(path, '﻿' + readFileSync(path, 'utf8'), 'utf8');

    expect(h.readAuth()).toEqual(original);
    h.writeAuth({ anthropic: { accessToken: 'new-signin' } });
    expect(h.readAuth()).toEqual({ ...original, anthropic: { accessToken: 'new-signin' } });
  });

  // #182 on the store where the loss is worst: a corrupt auth.json plus one sign-in used to persist
  // {} + the new credential, erasing every other API key and OAuth bundle. The sign-in now fails loudly
  // instead — the tokens on disk are unreadable either way, but they are still THERE to be recovered.
  test('a corrupt auth store is refused by the next sign-in, not overwritten (#182)', () => {
    const h = home();
    h.writeAuth({ keys: { groq: 'gk-real' }, codex: { accessToken: 'at' } });
    const path = join(dir, '.wisp', 'auth.json');
    writeFileSync(path, '{"keys":{"groq":"gk-rea', 'utf8');
    const before = readFileSync(path, 'utf8');

    expect(() => h.writeAuth({ anthropic: { accessToken: 'new-signin' } })).toThrow(/auth\.json/);
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  test('auth.json is owner-only on POSIX (Windows relies on the profile ACL)', () => {
    const h = home();
    h.writeAuth({ bridgeSecret: 'sec' });
    if (process.platform !== 'win32') {
      expect(statSync(join(dir, '.wisp', 'auth.json')).mode & 0o777).toBe(0o600);
    }
  });
});

// ----------------------------- watch ----------------------------- //

describe('watch', () => {
  test('an external edit to a store file fires the (debounced) change callback', async () => {
    const h = home();
    h.writeConfig({ provider: 'groq' });
    let fired = 0;
    const watcher = h.watch(() => { fired++; });
    try {
      // External writer (the TUI): plain write, not through this WispHome instance.
      writeFileSync(join(dir, '.wisp', 'config.json'), JSON.stringify({ provider: 'mistral' }));
      await new Promise<void>((resolve, reject) => {
        const started = Date.now();
        const poll = () => {
          if (fired > 0) return resolve();
          if (Date.now() - started > 3000) return reject(new Error('watch callback never fired'));
          setTimeout(poll, 50);
        };
        poll();
      });
      expect(fired).toBeGreaterThan(0);
    } finally {
      watcher.dispose();
    }
  });
});
