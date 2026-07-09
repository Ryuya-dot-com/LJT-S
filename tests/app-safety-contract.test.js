'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { extractFunctionDeclaration } = require('./helpers/javascript-source');

const ROOT = path.resolve(__dirname, '..');
const APP_SOURCE = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');

test('generated participant links take the confirmation-required branch', () => {
  const applyConfigToUrl = functionSource('applyConfigToUrl');
  const isParticipantTakeUrl = functionSource('isParticipantTakeUrl');
  const requiresParticipantConfirmation = functionSource('requiresParticipantConfirmation');

  assert.match(
    applyConfigToUrl,
    /searchParams\.set\(\s*['"]take['"]\s*,\s*participantMode\s*\?\s*['"]1['"]\s*:\s*['"]0['"]\s*\)/
  );
  assert.match(
    isParticipantTakeUrl,
    /params\.get\(\s*['"]take['"]\s*\)\s*===\s*['"]1['"]/
  );
  assert.match(requiresParticipantConfirmation, /\bisParticipantTakeUrl\(\)/);
});

test('registration does not reuse a previous completed participant ID as a suggestion', () => {
  const registration = functionSource('renderParticipantRegistration');

  assert.doesNotMatch(registration, /\breadRecentParticipantId\b/);
  assert.match(registration, /\bcreateAnonymousParticipantId\(\)/);
});

test('completion saves a resumable result instead of deleting it immediately', () => {
  const completeSession = functionSource('completeSession');

  const stageIndex = completeSession.search(/state\.stage\s*=\s*['"]complete['"]/);
  const saveIndex = completeSession.search(/\bsavePartialSession\(\)/);
  assert.notEqual(stageIndex, -1);
  assert.notEqual(saveIndex, -1);
  assert.doesNotMatch(completeSession, /\bremovePartialSession\(/);
  assert.ok(
    stageIndex < saveIndex,
    'the completed stage must be set before the snapshot is saved'
  );
});

test('saved sessions expire after 24 hours and explicit cleanup clears session-linked state', () => {
  const ttlMatch = APP_SOURCE.match(/\bconst\s+PARTIAL_STORAGE_TTL_MS\s*=\s*([^;]+);/);
  assert.ok(ttlMatch, 'PARTIAL_STORAGE_TTL_MS is missing');
  assert.match(ttlMatch[1], /^[\d\s*+()/-]+$/);
  const ttl = vm.runInNewContext(ttlMatch[1]);
  assert.equal(ttl, 24 * 60 * 60 * 1000);

  const parsePartialSnapshot = functionSource('parsePartialSnapshot');
  assert.match(parsePartialSnapshot, /Date\.now\(\)\s*-\s*savedAt\s*>\s*PARTIAL_STORAGE_TTL_MS/);
  assert.match(parsePartialSnapshot, /\bremovePartialSession\(\s*storageKey\s*\)/);

  const clearCurrentSessionData = functionSource('clearCurrentSessionData');
  assert.match(clearCurrentSessionData, /\bremovePartialSession\(/);
  assert.match(clearCurrentSessionData, /\bremoveQueuedSubmissionForSession\(/);
  assert.match(clearCurrentSessionData, /\bclearRecentParticipantId\(\)/);
});

function functionSource(name) {
  return extractFunctionDeclaration(APP_SOURCE, name);
}
