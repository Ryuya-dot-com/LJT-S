'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  inspectOfflinePackage,
  inspectOnlinePackage
} = require('./helpers/offline-package');

const ROOT = path.resolve(__dirname, '..');
const COMPATIBILITY_ZIP = path.join(ROOT, 'dist', 'LJT-S-online-20260701.zip');
const CURRENT_ZIP = path.join(ROOT, 'dist', 'LJT-S-offline-20260710.zip');

test('the compatibility online ZIP remains complete at its existing release path', () => {
  assert.ok(fs.existsSync(COMPATIBILITY_ZIP), 'compatibility online ZIP is missing');
  const report = inspectOnlinePackage(COMPATIBILITY_ZIP, { sourceRoot: ROOT });

  assert.equal(report.archiveRoot, 'LJT-S-online-20260701');
  assert.equal(report.valid, true, report.errors.join('\n'));
  assert.equal(report.files.filter(name => name.startsWith('audio/')).length, 44);
  assert.equal(report.files.some(name => /\.wav$/i.test(name)), false);
});

test('the current purpose-built offline package is complete and self-contained', () => {
  assert.ok(
    fs.existsSync(CURRENT_ZIP),
    `build the offline artifact first: ${path.relative(ROOT, CURRENT_ZIP)}`
  );
  const report = inspectOfflinePackage(CURRENT_ZIP, { sourceRoot: ROOT });

  assert.equal(report.archiveRoot, 'LJT-S-offline-20260710');
  assert.equal(report.valid, true, report.errors.join('\n'));
  assert.equal(report.files.filter(name => name.startsWith('audio/')).length, 44);
});
