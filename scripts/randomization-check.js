#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const N = Number(process.argv[2] || 500);
const OUT_DIR = path.join(ROOT, 'qa');
const ITEMS_PATH = path.join(ROOT, 'data', 'items.js');
const APP_VERSION = 'LJT-S-online-20260701';
const DEFAULTS = {
  seed: 'LJT-S-20260629',
  mode: 'timed',
  maxAnswerRun: 2,
  sameWordGap: 8
};

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(ITEMS_PATH, 'utf8'), sandbox);
const ITEMS = sandbox.window.LJT_SHORT_ITEMS || [];

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const rows = [];
  for (let i = 1; i <= N; i += 1) {
    const participantId = `sim-${String(i).padStart(4, '0')}`;
    const seed = `${DEFAULTS.seed}|${participantId}|${DEFAULTS.mode}|${APP_VERSION}`;
    const result = buildConstrainedOrder(ITEMS, seed, DEFAULTS.maxAnswerRun, DEFAULTS.sameWordGap);
    const counts = countAnswers(result.items);
    rows.push({
      participant_id: participantId,
      n_items: result.items.length,
      n_appropriate: counts.appropriate,
      n_inappropriate: counts.inappropriate,
      max_observed_run: result.diagnostics.maxObservedRun,
      same_word_gap_requested: result.diagnostics.sameWordGapRequested,
      same_word_gap_used: result.diagnostics.sameWordGapUsed,
      same_word_gap_violations: result.diagnostics.sameWordGapViolations,
      attempts: result.diagnostics.attempts,
      status: result.diagnostics.status
    });
  }

  const failures = rows.filter(row =>
    row.n_items !== 40 ||
    row.n_appropriate !== 20 ||
    row.n_inappropriate !== 20 ||
    row.max_observed_run > DEFAULTS.maxAnswerRun ||
    row.same_word_gap_violations > 0
  );

  const summary = {
    generated_at_iso: new Date().toISOString(),
    n_participants: N,
    failures: failures.length,
    max_attempts: Math.max(...rows.map(row => row.attempts)),
    relaxed_gap_count: rows.filter(row => row.status === 'gap_relaxed').length,
    fallback_count: rows.filter(row => row.status === 'fallback_best_available').length
  };

  fs.writeFileSync(path.join(OUT_DIR, 'randomization_simulation_summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'randomization_simulation_500.csv'), toCsv(rows));
  console.log(JSON.stringify(summary, null, 2));
  if (failures.length) process.exitCode = 1;
}

function countAnswers(items) {
  return items.reduce((acc, item) => {
    acc[item.correct_answer] = (acc[item.correct_answer] || 0) + 1;
    return acc;
  }, { appropriate: 0, inappropriate: 0 });
}

function buildConstrainedOrder(items, seed, maxRun, requestedGap) {
  const rng = mulberry32(hashString(seed));
  const appropriate = items.filter(item => item.correct_answer === 'appropriate');
  const inappropriate = items.filter(item => item.correct_answer === 'inappropriate');
  let best = null;
  for (let gap = requestedGap; gap >= 0; gap -= 1) {
    for (let attempt = 1; attempt <= 3000; attempt += 1) {
      const pattern = randomAnswerPattern(appropriate.length, inappropriate.length, rng, maxRun);
      if (!pattern) continue;
      const appItems = shuffle(appropriate.map((item, index) => ({ ...item, order_uid: `${item.item_id}_${index}` })), rng);
      const inappItems = shuffle(inappropriate.map((item, index) => ({ ...item, order_uid: `${item.item_id}_${index}` })), rng);
      let appIndex = 0;
      let inappIndex = 0;
      const candidate = pattern.map(answer => {
        if (answer === 'appropriate') {
          const item = appItems[appIndex];
          appIndex += 1;
          return item;
        }
        const item = inappItems[inappIndex];
        inappIndex += 1;
        return item;
      });
      const diagnostics = diagnoseOrder(candidate, maxRun, gap, attempt);
      if (diagnostics.maxObservedRun <= maxRun && diagnostics.sameWordGapViolations === 0) {
        diagnostics.sameWordGapRequested = requestedGap;
        diagnostics.sameWordGapUsed = gap;
        diagnostics.status = gap === requestedGap ? 'requested_constraints_satisfied' : 'gap_relaxed';
        return { items: candidate, diagnostics };
      }
      if (!best || diagnostics.score < best.diagnostics.score) {
        best = { items: candidate, diagnostics: { ...diagnostics, sameWordGapUsed: gap } };
      }
    }
  }
  best.diagnostics.sameWordGapRequested = requestedGap;
  best.diagnostics.status = 'fallback_best_available';
  return best;
}

function randomAnswerPattern(nAppropriate, nInappropriate, rng, maxRun) {
  const counts = { appropriate: nAppropriate, inappropriate: nInappropriate };
  const pattern = [];
  let last = null;
  let run = 0;
  const total = nAppropriate + nInappropriate;

  for (let slot = 0; slot < total; slot += 1) {
    const choices = ['appropriate', 'inappropriate'].filter(answer => {
      if (counts[answer] <= 0) return false;
      return !(answer === last && run >= maxRun);
    });
    if (!choices.length) return null;

    const totalWeight = choices.reduce((acc, answer) => acc + counts[answer], 0);
    let pick = rng() * totalWeight;
    let chosen = choices[choices.length - 1];
    for (const answer of choices) {
      pick -= counts[answer];
      if (pick <= 0) {
        chosen = answer;
        break;
      }
    }

    pattern.push(chosen);
    counts[chosen] -= 1;
    if (chosen === last) {
      run += 1;
    } else {
      last = chosen;
      run = 1;
    }
  }
  return pattern;
}

function diagnoseOrder(items, maxRun, gap, attempts) {
  let maxObservedRun = 0;
  let run = 0;
  let lastAnswer = null;
  let sameWordGapViolations = 0;
  const lastSeen = new Map();

  items.forEach((item, index) => {
    if (item.correct_answer === lastAnswer) {
      run += 1;
    } else {
      run = 1;
      lastAnswer = item.correct_answer;
    }
    maxObservedRun = Math.max(maxObservedRun, run);
    const word = String(item.target_word || '').toLowerCase();
    if (lastSeen.has(word) && index - lastSeen.get(word) <= gap) {
      sameWordGapViolations += 1;
    }
    lastSeen.set(word, index);
  });

  const score = Math.max(0, maxObservedRun - maxRun) * 100 + sameWordGapViolations * 10;
  return { maxObservedRun, sameWordGapViolations, attempts, score };
}

function shuffle(values, rng) {
  const arr = values.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function hashString(value) {
  let h = 2166136261;
  const s = String(value);
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  return function rng() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toCsv(rows) {
  const headers = Object.keys(rows[0] || {});
  return headers.join(',') + '\n' + rows.map(row => headers.map(header => csvCell(row[header])).join(',')).join('\n') + '\n';
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

main();
