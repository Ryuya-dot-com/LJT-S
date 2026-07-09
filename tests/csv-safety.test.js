'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { extractFunctionDeclaration } = require('./helpers/javascript-source');

const ROOT = path.resolve(__dirname, '..');
const APP_PATH = path.join(ROOT, 'js', 'app.js');
const GAS_PATH = path.join(ROOT, 'gas', 'Code.gs');

const appCsvCell = loadNamedFunction(APP_PATH, 'csvCell');
const gasContext = loadGasScript(GAS_PATH);
const gasCsvCell = gasContext.csvCell;

for (const [implementation, csvCell] of [
  ['browser export', appCsvCell],
  ['GAS email attachment', gasCsvCell]
]) {
  test(`${implementation} neutralizes spreadsheet formula prefixes`, () => {
    const dangerousValues = [
      '=2+2',
      '+SUM(1,2)',
      '-2+3',
      '@SUM(A1:A2)',
      '  =2+2',
      '\t=2+2',
      '\r=2+2',
      '\n=2+2'
    ];

    for (const value of dangerousValues) {
      const decoded = decodeSingleCsvCell(csvCell(value));
      assert.doesNotMatch(decoded, /^\s*[=+\-@]/, `unsafe output for ${JSON.stringify(value)}`);
      assert.ok(decoded.includes(value), `the original value should remain auditable: ${value}`);
    }
  });

  test(`${implementation} preserves ordinary CSV escaping`, () => {
    assert.equal(csvCell(null), '');
    assert.equal(csvCell(undefined), '');
    assert.equal(csvCell('plain text'), 'plain text');
    assert.equal(csvCell('  plain text'), '  plain text');
    assert.equal(csvCell(42), '42');
    assert.equal(csvCell(-42), '-42');
    assert.equal(decodeSingleCsvCell(csvCell('hello, "researcher"')), 'hello, "researcher"');
  });
}

test('GAS result rows preserve legitimate zero condition scores', () => {
  const rows = gasContext.resultRows({
    completed_at_iso: '2026-07-10T00:00:00.000Z',
    session_id: 'zero-score-regression',
    summary: {
      raw_score: 0,
      n_main_scored: 40,
      n_main: 40,
      n_main_excluded: 0,
      appropriate_score: 0,
      inappropriate_score: 0,
      timeouts: 0
    },
    trial_log: [{ phase: 'main', trial_number: 1, correct: 0 }]
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].main_raw_score, 0);
  assert.equal(rows[0].appropriate_score, 0);
  assert.equal(rows[0].inappropriate_score, 0);
});

function loadGasScript(filePath) {
  const context = {};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(filePath, 'utf8'), context, { filename: filePath });
  return context;
}

function loadNamedFunction(filePath, functionName) {
  const source = fs.readFileSync(filePath, 'utf8');
  const declaration = extractFunctionDeclaration(source, functionName);
  return vm.runInNewContext(`(${declaration})`, {}, { filename: filePath });
}

function decodeSingleCsvCell(value) {
  const cell = String(value);
  if (!cell.startsWith('"')) return cell;
  assert.ok(cell.endsWith('"'), `malformed quoted CSV cell: ${cell}`);
  return cell.slice(1, -1).replaceAll('""', '"');
}
