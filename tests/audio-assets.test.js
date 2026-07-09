'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { loadBrowserDataScript } = require('./helpers/browser-data');

const ROOT = path.resolve(__dirname, '..');
const data = loadBrowserDataScript(path.join(ROOT, 'data', 'items.js'));
const mainItems = data.LJT_SHORT_ITEMS;
const practiceItems = data.LJT_SHORT_PRACTICE_ITEMS;

test('the fixed form references exactly 40 main and 4 practice audio files', () => {
  assert.equal(mainItems.length, 40);
  assert.equal(practiceItems.length, 4);

  const paths = [...mainItems, ...practiceItems].map(item => item.audio_path);
  assert.equal(paths.length, 44);
  assert.equal(new Set(paths).size, 44, 'every item must reference a distinct file');
  assert.equal(mainItems.filter(item => item.item_type === 'appropriate').length, 20);
  assert.equal(mainItems.filter(item => item.item_type === 'inappropriate').length, 20);
});

test('all 44 referenced audio assets exist, are non-empty M4A files, and no extras are shipped', () => {
  const referenced = new Set(
    [...mainItems, ...practiceItems].map(item => item.audio_path.replaceAll('\\', '/'))
  );

  for (const relativePath of referenced) {
    assert.match(relativePath, /^audio\/(main|practice)\/[A-Za-z0-9._-]+\.m4a$/);
    const absolutePath = path.join(ROOT, ...relativePath.split('/'));
    const stat = fs.statSync(absolutePath);
    assert.ok(stat.isFile(), `${relativePath} is not a regular file`);
    assert.ok(stat.size > 0, `${relativePath} is empty`);

    const header = fs.readFileSync(absolutePath).subarray(0, 12);
    assert.equal(header.subarray(4, 8).toString('ascii'), 'ftyp', `${relativePath} is not MP4/M4A`);
  }

  const actual = new Set(listFiles(path.join(ROOT, 'audio')).map(filePath => (
    path.relative(ROOT, filePath).split(path.sep).join('/')
  )));
  assert.deepEqual(actual, referenced);
});

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const child = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(child) : [child];
  });
}
