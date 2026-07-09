'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { loadBrowserDataScript } = require('./helpers/browser-data');

const ROOT = path.resolve(__dirname, '..');
const conversion = loadBrowserDataScript(
  path.join(ROOT, 'data', 'conversion.js')
).LJT_SHORT_CONVERSION;

const EXPECTED_RANGES = [
  { min: 0, max: 20, toeicMin: 60, toeicMax: 105, cefr: 'A1' },
  { min: 21, max: 22, toeicMin: 110, toeicMax: 185, cefr: 'A2_lower' },
  { min: 23, max: 25, toeicMin: 190, toeicMax: 270, cefr: 'A2_upper' },
  { min: 26, max: 29, toeicMin: 275, toeicMax: 330, cefr: 'B1_lower' },
  { min: 30, max: 32, toeicMin: 335, toeicMax: 395, cefr: 'B1_upper' },
  { min: 33, max: 35, toeicMin: 400, toeicMax: 440, cefr: 'B2_lower' },
  { min: 36, max: 37, toeicMin: 445, toeicMax: 485, cefr: 'B2_upper' },
  { min: 38, max: 40, toeicMin: 490, toeicMax: 495, cefr: 'C1' }
];

test('TOEIC/CEFR estimate is unavailable unless all 40 main items were scored', () => {
  for (const nItems of [undefined, null, 0, 1, 20, 39, 41, Number.NaN]) {
    const estimate = conversion.estimateToeicListening({ rawScore: 20, nItems });
    assert.equal(estimate.available, false, `nItems=${String(nItems)}`);
    assert.equal(estimate.status, 'incomplete_form', `nItems=${String(nItems)}`);
  }

  const missing = conversion.estimateToeicListening({ rawScore: 20 });
  assert.equal(missing.available, false);
  assert.equal(missing.status, 'incomplete_form');
});

test('invalid raw scores remain invalid when the 40-item form is complete', () => {
  for (const rawScore of [undefined, 'not-a-number', Number.NaN]) {
    const estimate = conversion.estimateToeicListening({ rawScore, nItems: 40 });
    assert.equal(estimate.available, false);
    assert.equal(estimate.status, 'invalid_input');
  }
});

test('the established conversion table is preserved for every complete-form raw score', () => {
  for (let rawScore = 0; rawScore <= 40; rawScore += 1) {
    const expected = EXPECTED_RANGES.find(
      range => rawScore >= range.min && rawScore <= range.max
    );
    const estimate = conversion.estimateToeicListening({ rawScore, nItems: 40 });

    assert.equal(estimate.available, true, `rawScore=${rawScore}`);
    assert.equal(estimate.status, 'estimated', `rawScore=${rawScore}`);
    assert.equal(estimate.rawScore, rawScore, `rawScore=${rawScore}`);
    assert.equal(estimate.scoreMin, expected.toeicMin, `rawScore=${rawScore}`);
    assert.equal(estimate.scoreMax, expected.toeicMax, `rawScore=${rawScore}`);
    assert.equal(
      estimate.toeicRange,
      `${expected.toeicMin}-${expected.toeicMax}`,
      `rawScore=${rawScore}`
    );
    assert.equal(estimate.cefr, expected.cefr, `rawScore=${rawScore}`);
  }
});

test('complete-form out-of-range scores retain the existing 0..40 clamping behavior', () => {
  const below = conversion.estimateToeicListening({ rawScore: -10, nItems: 40 });
  const above = conversion.estimateToeicListening({ rawScore: 99, nItems: 40 });

  assert.equal(below.available, true);
  assert.equal(below.rawScore, 0);
  assert.equal(below.toeicRange, '60-105');
  assert.equal(above.available, true);
  assert.equal(above.rawScore, 40);
  assert.equal(above.toeicRange, '490-495');
});
